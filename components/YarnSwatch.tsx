import clsx from "clsx";
import type { Yarn } from "@/lib/mock";

export function YarnSwatch({
  yarn,
  size = 40,
  className,
}: {
  yarn: Pick<Yarn, "swatch" | "colorway">;
  size?: number;
  className?: string;
}) {
  return (
    <span
      title={yarn.colorway || undefined}
      aria-hidden
      className={clsx(
        "block shrink-0 rounded-full ring-2 ring-white shadow-soft",
        className
      )}
      style={{
        width: size,
        height: size,
        background: yarn.swatch,
      }}
    />
  );
}
