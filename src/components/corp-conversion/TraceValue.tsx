"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Basis } from "@/lib/tax/sources";
import type { Traced } from "@/lib/tax/trace";
import { formatWon } from "@/lib/won";

function basisText(b: Basis): { text: string; href?: string; assumption?: boolean } {
  if (b.kind === "law") {
    return {
      text: `${b.law} ${b.article} (${b.appliesTo}, 확인 ${b.confirmedAt})`,
      href: b.url,
    };
  }
  if (b.kind === "official") {
    return { text: b.source, href: b.url };
  }
  return { text: `가정: ${b.description}`, assumption: true };
}

export function TraceValue({ t }: { t: Traced }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="num border-b border-dashed border-ink text-left hover:text-accent"
      >
        {formatWon(t.value)}
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={t.label}
          className="absolute left-0 z-20 mt-2 w-72 border border-ink bg-paper p-3 text-left text-xs leading-relaxed shadow-sm"
        >
          <p className="text-muted">{t.label}</p>
          {t.steps.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {t.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {t.basis.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-line pt-2">
              {t.basis.map((b, i) => {
                const info = basisText(b);
                return (
                  <li key={`${b.kind}-${i}`}>
                    {info.href ? (
                      <a href={info.href} target="_blank" rel="noreferrer" className="underline">
                        {info.text}
                      </a>
                    ) : (
                      <span>{info.text}</span>
                    )}
                    {info.assumption && (
                      <span className="ml-2 border border-line px-1 text-[10px] text-muted">
                        수정 가능
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
