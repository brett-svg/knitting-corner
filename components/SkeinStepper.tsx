"use client";

import { useEffect, useState } from "react";

export function SkeinStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label = "Skeins",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  // Keep the raw text locally so the field can be cleared and retyped;
  // only valid numbers are pushed up, and blur restores the last good value.
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="block text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-xl text-ink transition hover:bg-tint/60 disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={text}
          min={min}
          max={max}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setText(e.target.value);
            const n = Math.round(Number(e.target.value));
            if (e.target.value !== "" && Number.isFinite(n) && n >= min) {
              onChange(Math.min(max, n));
            }
          }}
          onBlur={() => setText(String(value))}
          className="h-11 w-16 rounded-xl border border-border bg-white text-center text-lg font-display text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
        />
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-xl text-ink transition hover:bg-tint/60 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
