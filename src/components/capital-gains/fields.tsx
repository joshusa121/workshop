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

export function DateInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm">{label}</span>
      {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>}
      <input
        type="date"
        className="num mt-1 w-full min-w-0 border-0 border-b border-ink bg-transparent py-2 outline-none focus:border-accent"
        value={value}
        min="1985-01-01"
        max="2099-12-31"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function Check({
  checked,
  onChange,
  children,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1 accent-accent" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {children}
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm">{legend}</legend>
      <div className="mt-2 space-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              className="mt-1 accent-accent"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>
              {o.label}
              {o.hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
