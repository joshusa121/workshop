"use client";
import type { Traced } from "@/lib/tax/trace";

/** 돈이 아닌 비율도 같은 Traced 근거를 열어볼 수 있게 한다. */
export function TraceRate({ t, unit = "%" }: { t: Traced; unit?: string }) {
  return <details className="group relative inline-block text-left">
    <summary className="num cursor-pointer list-none border-b border-dashed border-ink hover:text-accent">{unit === "%" ? Number((t.value * 100).toFixed(4)) : t.value}{unit}<span className="sr-only"> {t.label} 근거 보기</span></summary>
    <div className="absolute right-0 z-20 mt-2 w-64 border border-ink bg-paper p-3 text-xs leading-relaxed shadow-sm print:hidden">
      <p>{t.label}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">{t.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <ul className="mt-3 space-y-2 border-t border-line pt-2">{t.basis.map((b, i) => <li key={i}>{b.kind === "law" ? <a className="underline" href={b.url} target="_blank" rel="noreferrer">{b.law} {b.article} · 확인 {b.confirmedAt}</a> : b.kind === "official" ? <a className="underline" href={b.url}>{b.source}</a> : `가정: ${b.description}`}</li>)}</ul>
    </div>
  </details>;
}
