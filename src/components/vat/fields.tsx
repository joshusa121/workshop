"use client";

import type { ReactNode } from "react";

export function ManInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: number;
  onChange: (won: number) => void;
}) {
  const man = value / 10_000;
  return (
    <label className="block min-w-0">
      <span className="text-sm">{label}</span>
      {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>}
      <span className="mt-1 flex items-baseline gap-2 border-b border-ink focus-within:border-accent">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          className="num w-full min-w-0 bg-transparent py-2 outline-none"
          value={man === 0 ? "" : man}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0) * 10_000)}
        />
        <span className="text-xs text-muted">만원</span>
      </span>
    </label>
  );
}

export function Radio<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string; note?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm">{legend}</legend>
      <div className="mt-2 grid gap-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-start gap-2 text-sm">
            <input type="radio" className="mt-1 accent-accent" checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>
              {o.label}
              {o.note && <span className="ml-2 text-xs text-muted">{o.note}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
