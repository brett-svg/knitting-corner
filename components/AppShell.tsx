import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { NavLinks } from "@/components/NavLinks";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="block h-7 w-7 rounded-full bg-grad-signature shadow-glow"
            />
            <span className="font-display text-xl tracking-tight">
              Knitting <span className="italic text-grad">Corner</span>
            </span>
          </Link>

          <NavLinks variant="header" />

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/stash/add/scan" className="btn-grad">
              <CameraIcon /> Scan yarn
            </Link>
            {user ? (
              <form action="/auth/signout" method="post">
                <button
                  className="rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs text-muted backdrop-blur transition hover:text-ink"
                  title={user.email ?? undefined}
                >
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-36 pt-8 md:px-6 md:pb-24 md:pt-10">{children}</main>

      <NavLinks variant="bottom" />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
