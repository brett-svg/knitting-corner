-- Knitting Corner: core schema
-- Run in the Supabase SQL editor (or `supabase db push`) once per project.

create extension if not exists "pgcrypto";

create table if not exists storage_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists yarns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text,
  product_line text,
  fiber text,
  weight_category text,
  yardage int,
  meters int,
  skein_weight_grams int,
  colorway text,
  dye_lot text,
  needle_size text,
  skeins int not null default 1,
  storage_location_id uuid references storage_locations(id) on delete set null,
  swatch text, -- CSS gradient or hex; until we wire image storage
  image_url text,
  reserved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists needles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  size_us text,
  size_mm numeric,
  type text,    -- circular | dpn | interchangeable | straight
  length_cm int,
  material text,
  quantity int not null default 1,
  storage_location_id uuid references storage_locations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists hooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  size_us text,
  size_mm numeric,
  material text,
  quantity int not null default 1,
  storage_location_id uuid references storage_locations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists notions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity int not null default 1,
  storage_location_id uuid references storage_locations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  designer text,
  external_url text,
  pdf_path text,         -- path in supabase storage
  cover_url text,        -- public URL to first-page thumbnail
  yarn_weight text,
  required_yardage int,
  needle_size text,
  notes text,
  created_at timestamptz not null default now()
);

-- For projects added before cover_url existed
alter table patterns add column if not exists cover_url text;

-- Gift tracking on projects
alter table projects add column if not exists recipient text;
alter table projects add column if not exists gift_date date;
alter table projects add column if not exists finished_at date;

-- Free-form notes on yarn skeins
alter table yarns add column if not exists notes text;

-- Richer pattern metadata extractable from PDFs
alter table patterns add column if not exists gauge text;
alter table patterns add column if not exists sizes text;
alter table patterns add column if not exists construction text;
alter table patterns add column if not exists techniques text;
alter table patterns add column if not exists garment_type text;
alter table patterns add column if not exists recommended_yarn text;

-- Force PostgREST to refresh its schema cache so new columns are
-- visible to the API immediately after running this file.
notify pgrst, 'reload schema';

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  pattern_id uuid references patterns(id) on delete set null,
  status text not null default 'Planned',  -- Planned | Active | Paused | Completed
  progress numeric not null default 0,     -- 0..1
  notes text,
  hero text,    -- gradient or image
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_yarns (
  project_id uuid references projects(id) on delete cascade,
  yarn_id uuid references yarns(id) on delete cascade,
  primary key (project_id, yarn_id)
);

create table if not exists project_tools (
  project_id uuid references projects(id) on delete cascade,
  needle_id uuid references needles(id) on delete cascade,
  primary key (project_id, needle_id)
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unique (user_id, name)
);

-- ── Row Level Security ────────────────────────────────────────────────────
alter table storage_locations enable row level security;
alter table yarns             enable row level security;
alter table needles           enable row level security;
alter table hooks             enable row level security;
alter table notions           enable row level security;
alter table patterns          enable row level security;
alter table projects          enable row level security;
alter table project_yarns     enable row level security;
alter table project_tools     enable row level security;
alter table tags              enable row level security;

-- Generic owner-only policy template
do $$
declare t text;
begin
  for t in select unnest(array[
    'storage_locations','yarns','needles','hooks','notions',
    'patterns','projects','tags'
  ])
  loop
    execute format('drop policy if exists "%1$s_own" on %1$s;', t);
    execute format($p$
      create policy "%1$s_own" on %1$s
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $p$, t);
  end loop;
end $$;

-- ── Storage bucket for yarn photos ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('yarn-photos', 'yarn-photos', true)
on conflict (id) do nothing;

-- Anyone can read public yarn photos (bucket is public anyway)
drop policy if exists "yarn_photos_read" on storage.objects;
create policy "yarn_photos_read" on storage.objects
  for select using (bucket_id = 'yarn-photos');

-- Owners can write their own folder: yarn-photos/<user_id>/...
drop policy if exists "yarn_photos_write_own" on storage.objects;
create policy "yarn_photos_write_own" on storage.objects
  for insert
  with check (
    bucket_id = 'yarn-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "yarn_photos_delete_own" on storage.objects;
create policy "yarn_photos_delete_own" on storage.objects
  for delete
  using (
    bucket_id = 'yarn-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Storage bucket for pattern PDFs (private; signed URLs for viewing) ────
insert into storage.buckets (id, name, public)
values ('pattern-pdfs', 'pattern-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "pattern_pdfs_read_own" on storage.objects;
create policy "pattern_pdfs_read_own" on storage.objects
  for select using (
    bucket_id = 'pattern-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "pattern_pdfs_write_own" on storage.objects;
create policy "pattern_pdfs_write_own" on storage.objects
  for insert with check (
    bucket_id = 'pattern-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "pattern_pdfs_delete_own" on storage.objects;
create policy "pattern_pdfs_delete_own" on storage.objects
  for delete using (
    bucket_id = 'pattern-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Storage bucket for pattern cover thumbnails (public) ──────────────────
insert into storage.buckets (id, name, public)
values ('pattern-covers', 'pattern-covers', true)
on conflict (id) do nothing;

drop policy if exists "pattern_covers_read" on storage.objects;
create policy "pattern_covers_read" on storage.objects
  for select using (bucket_id = 'pattern-covers');

drop policy if exists "pattern_covers_write_own" on storage.objects;
create policy "pattern_covers_write_own" on storage.objects
  for insert with check (
    bucket_id = 'pattern-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "pattern_covers_delete_own" on storage.objects;
create policy "pattern_covers_delete_own" on storage.objects
  for delete using (
    bucket_id = 'pattern-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Join tables: access via parent project ownership
drop policy if exists project_yarns_own on project_yarns;
create policy project_yarns_own on project_yarns
  for all
  using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));

drop policy if exists project_tools_own on project_tools;
create policy project_tools_own on project_tools
  for all
  using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));
