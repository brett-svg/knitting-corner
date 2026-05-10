import { hasSupabase, supabaseServer } from "@/lib/supabase/server";
import {
  yarns as mockYarns,
  projects as mockProjects,
  patterns as mockPatterns,
  needles as mockNeedles,
  hooks as mockHooks,
  notions as mockNotions,
  locations as mockLocations,
  type Yarn,
  type Project,
  type Pattern,
  type Needle,
  type Hook,
  type Notion,
  type StorageLocation,
  type WeightCategory,
} from "@/lib/mock";

type YarnRow = {
  id: string;
  brand: string | null;
  product_line: string | null;
  colorway: string | null;
  dye_lot: string | null;
  fiber: string | null;
  weight_category: string | null;
  yardage: number | null;
  meters: number | null;
  skein_weight_grams: number | null;
  skeins: number | null;
  reserved: boolean | null;
  swatch: string | null;
  image_url: string | null;
  storage_location_id: string | null;
  storage_locations: { name: string } | null;
  notes: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  name: string;
  status: Project["status"];
  progress: number;
  hero: string | null;
  image_url: string | null;
  updated_at: string;
  recipient: string | null;
  gift_date: string | null;
  finished_at: string | null;
  patterns: { name: string; designer: string | null } | null;
  project_yarns: { yarn_id: string }[] | null;
};

function rowToYarn(r: YarnRow): Yarn {
  return {
    id: r.id,
    brand: r.brand ?? "",
    productLine: r.product_line ?? "",
    colorway: r.colorway ?? "",
    dyeLot: r.dye_lot ?? "",
    fiber: r.fiber ?? "",
    weight: (r.weight_category ?? "DK") as Yarn["weight"],
    yardage: r.yardage ?? 0,
    meters: r.meters ?? 0,
    skeinGrams: r.skein_weight_grams ?? 0,
    skeins: r.skeins ?? 1,
    storage: r.storage_locations?.name ?? "",
    swatch: r.swatch ?? "linear-gradient(135deg,#C084FC,#60A5FA)",
    imageUrl: r.image_url ?? null,
    locationId: r.storage_location_id,
    locationName: r.storage_locations?.name ?? null,
    reserved: r.reserved ?? false,
    notes: r.notes,
    addedAt: r.created_at.slice(0, 10),
  };
}

export async function getYarns(): Promise<Yarn[]> {
  if (!hasSupabase()) return mockYarns;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("yarns")
    .select(
      "id,brand,product_line,colorway,dye_lot,fiber,weight_category,yardage,meters,skein_weight_grams,skeins,reserved,swatch,image_url,storage_location_id,storage_locations(name),notes,created_at"
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[data] getYarns:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as YarnRow[]).map(rowToYarn);
}

export async function getProjects(): Promise<Project[]> {
  if (!hasSupabase()) return mockProjects;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,name,status,progress,hero,image_url,updated_at,recipient,gift_date,finished_at,patterns(name,designer),project_yarns(yarn_id)"
    )
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[data] getProjects:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as ProjectRow[]).map(rowToProject);
}

function rowToProject(p: ProjectRow): Project {
  return {
    id: p.id,
    name: p.name,
    pattern: p.patterns?.designer ?? p.patterns?.name ?? "—",
    status: p.status,
    progress: Number(p.progress ?? 0),
    yarnIds: (p.project_yarns ?? []).map((j) => j.yarn_id),
    hero: p.hero ?? p.image_url ?? "linear-gradient(135deg,#C084FC,#60A5FA)",
    updatedAt: p.updated_at.slice(0, 10),
    recipient: p.recipient,
    giftDate: p.gift_date,
    finishedAt: p.finished_at,
  };
}

type PatternRow = {
  id: string;
  name: string;
  designer: string | null;
  external_url: string | null;
  pdf_path: string | null;
  cover_url: string | null;
  yarn_weight: string | null;
  required_yardage: number | null;
  needle_size: string | null;
  notes: string | null;
  created_at: string;
};

const COVERS = [
  "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#C084FC 100%)",
  "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
  "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#60A5FA 100%)",
  "linear-gradient(135deg,#A7F3D0 0%,#5EEAD4 50%,#60A5FA 100%)",
  "linear-gradient(135deg,#FFE4E6 0%,#FBCFE8 50%,#C084FC 100%)",
];
function coverFor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COVERS[Math.abs(h) % COVERS.length];
}

function rowToPattern(r: PatternRow): Pattern {
  return {
    id: r.id,
    name: r.name,
    designer: r.designer,
    externalUrl: r.external_url,
    pdfPath: r.pdf_path,
    coverUrl: r.cover_url ?? null,
    yarnWeight: (r.yarn_weight ?? null) as WeightCategory | null,
    requiredYardage: r.required_yardage,
    needleSize: r.needle_size,
    notes: r.notes,
    cover: coverFor(r.name + r.id),
    createdAt: r.created_at.slice(0, 10),
  };
}

export async function getPatterns(): Promise<Pattern[]> {
  if (!hasSupabase()) return mockPatterns;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("patterns")
    .select(
      "id,name,designer,external_url,pdf_path,cover_url,yarn_weight,required_yardage,needle_size,notes,created_at"
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[data] getPatterns:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as PatternRow[]).map(rowToPattern);
}

export async function getPattern(id: string): Promise<Pattern | null> {
  if (!hasSupabase()) {
    return mockPatterns.find((p) => p.id === id) ?? null;
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("patterns")
    .select(
      "id,name,designer,external_url,pdf_path,cover_url,yarn_weight,required_yardage,needle_size,notes,created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[data] getPattern:", error.message);
    return null;
  }
  return data ? rowToPattern(data as PatternRow) : null;
}

export async function getYarn(id: string): Promise<Yarn | null> {
  if (!hasSupabase()) {
    return mockYarns.find((y) => y.id === id) ?? null;
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("yarns")
    .select(
      "id,brand,product_line,colorway,dye_lot,fiber,weight_category,yardage,meters,skein_weight_grams,skeins,reserved,swatch,image_url,storage_location_id,storage_locations(name),notes,created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[data] getYarn:", error.message);
    return null;
  }
  return rowToYarn(data as unknown as YarnRow);
}

export async function getProjectsUsingYarn(yarnId: string): Promise<Project[]> {
  if (!hasSupabase()) {
    return mockProjects.filter((p) => p.yarnIds.includes(yarnId));
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("project_yarns")
    .select(
      "project_id, projects(id,name,status,progress,hero,image_url,updated_at,recipient,gift_date,finished_at,patterns(name,designer))"
    )
    .eq("yarn_id", yarnId);
  if (error || !data) return [];
  return data.flatMap<Project>((r) => {
    const p = (r as unknown as { projects: ProjectRow | null }).projects;
    if (!p) return [];
    return [{ ...rowToProject(p), yarnIds: [] }];
  });
}

export async function getProject(id: string): Promise<Project | null> {
  if (!hasSupabase()) {
    return mockProjects.find((p) => p.id === id) ?? null;
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,name,status,progress,hero,image_url,updated_at,recipient,gift_date,finished_at,patterns(name,designer),project_yarns(yarn_id)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[data] getProject:", error.message);
    return null;
  }
  return rowToProject(data as unknown as ProjectRow);
}

export async function getNeedles(): Promise<Needle[]> {
  if (!hasSupabase()) return mockNeedles;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("needles")
    .select("id,size_us,size_mm,type,length_cm,material,quantity")
    .order("size_mm", { ascending: true });
  if (error) {
    console.error("[data] getNeedles:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    sizeUs: r.size_us,
    sizeMm: r.size_mm == null ? null : Number(r.size_mm),
    type: r.type,
    lengthCm: r.length_cm,
    material: r.material,
    quantity: r.quantity ?? 1,
  }));
}

export async function getHooks(): Promise<Hook[]> {
  if (!hasSupabase()) return mockHooks;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("hooks")
    .select("id,size_us,size_mm,material,quantity")
    .order("size_mm", { ascending: true });
  if (error) {
    console.error("[data] getHooks:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    sizeUs: r.size_us,
    sizeMm: r.size_mm == null ? null : Number(r.size_mm),
    material: r.material,
    quantity: r.quantity ?? 1,
  }));
}

export async function getLocations(): Promise<StorageLocation[]> {
  if (!hasSupabase()) return mockLocations;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("storage_locations")
    .select("id,name")
    .order("name", { ascending: true });
  if (error) {
    console.error("[data] getLocations:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getNotions(): Promise<Notion[]> {
  if (!hasSupabase()) return mockNotions;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("notions")
    .select("id,name,quantity")
    .order("name", { ascending: true });
  if (error) {
    console.error("[data] getNotions:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    quantity: r.quantity ?? 1,
  }));
}

export async function getStats() {
  const [ys, ps] = await Promise.all([getYarns(), getProjects()]);
  return {
    skeins: ys.reduce((n, y) => n + y.skeins, 0),
    yardage: ys.reduce((n, y) => n + y.yardage * y.skeins, 0),
    brands: new Set(ys.map((y) => y.brand)).size,
    projects: ps.filter((p) => p.status === "Active").length,
  };
}
