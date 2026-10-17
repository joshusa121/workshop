import type { Traced } from "@/lib/tax/trace";

/** 공용 TraceValue는 원 전용이므로 비율·개수만 제품 안에서 표시한다. */
export function AuditTrace({ t, unit }: { t: Traced; unit: "%" | "개" }) {
  return <details className="relative inline-block text-sm">
    <summary className="num cursor-pointer list-none border-b border-dashed border-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-ink">
      {t.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}{unit}
    </summary>
    <div role="note" aria-label={t.label} className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-3rem)] border border-ink bg-paper p-3 text-left text-xs leading-relaxed shadow-sm">
      <p className="text-muted">{t.label}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">{t.steps.map(s => <li key={s}>{s}</li>)}</ul>
      <ul className="mt-3 space-y-2 border-t border-line pt-2">{t.basis.map((b, index) => <li key={index}>
        {b.kind === "assumption" ? `가정: ${b.description}` : <a href={b.url} target="_blank" rel="noreferrer" className="underline">{b.kind === "law" ? `${b.law} ${b.article} (${b.appliesTo}, 확인 ${b.confirmedAt})` : b.source}</a>}
      </li>)}</ul>
    </div>
  </details>;
}
