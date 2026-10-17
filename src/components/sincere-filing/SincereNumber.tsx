"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Traced } from "@/lib/tax/trace";

/** 연도·기한·비율에도 Traced의 근거를 표시한다. */
export function SincereNumber({ t, children, align = "right" }: { t: Traced; children: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-block align-baseline">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)} className="num border-b border-dashed border-ink hover:text-accent">{children}</button>
      {open && <span id={id} role="dialog" aria-label={t.label} className={`absolute ${align === "left" ? "left-0" : "right-0"} z-20 mt-2 block w-64 max-w-[80vw] border border-ink bg-paper p-3 text-left text-xs leading-relaxed shadow-sm`}>
        <span className="block text-muted">{t.label}</span>
        {t.steps.map(s => <span className="mt-2 block" key={s}>{s}</span>)}
        <span className="mt-3 block space-y-2 border-t border-line pt-2">{t.basis.map((b, n) => (
          <span className="block" key={n}>{b.kind === "law" ? <a href={b.url} target="_blank" rel="noreferrer" className="underline">{b.law} {b.article} · {b.appliesTo} · 확인 {b.confirmedAt}</a> : b.kind === "assumption" ? `입력 전제: ${b.description}` : <a href={b.url} className="underline">{b.source}</a>}</span>
        ))}</span>
      </span>}
    </span>
  );
}
