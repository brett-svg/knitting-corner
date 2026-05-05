"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Home" },
  { href: "/stash", label: "Stash" },
  { href: "/projects", label: "Projects" },
  { href: "/patterns", label: "Patterns" },
  { href: "/tools", label: "Tools" },
];

export function NavLinks({ variant }: { variant: "header" | "bottom" }) {
  const pathname = usePathname();
  const hide = pathname.startsWith("/login") || pathname.startsWith("/auth");
  if (hide) return null;

  if (variant === "header") {
    return (
      <nav className="hidden items-center gap-1 rounded-full border border-border bg-white/60 p-1 text-sm backdrop-blur md:flex">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-full px-4 py-1.5 transition",
                active
                  ? "bg-grad-signature text-white shadow-glow"
                  : "text-muted hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className="fixed inset-x-0 z-20 mx-auto flex w-[min(94%,440px)] items-center justify-between rounded-full border border-border bg-white/85 px-1.5 py-1.5 shadow-soft backdrop-blur-xl md:hidden"
      style={{
        bottom: "max(env(safe-area-inset-bottom), 1rem)",
      }}
    >
      {nav.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex-1 rounded-full px-2 py-2 text-center text-[11px] font-medium tracking-wide transition",
              active ? "bg-grad-signature text-white" : "text-muted"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
