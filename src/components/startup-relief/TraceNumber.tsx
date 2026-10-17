import type { Traced } from "@/lib/tax/trace";

/** 공용 TraceValue는 원 전용이므로, 비율·연도는 같은 Traced를 단위에 맞게 표시한다. */
export function TraceNumber({ t, unit }: { t: Traced; unit: "percent" | "year" }) {
  return (
    <details className="relative inline-block text-left font-sans text-sm">
      <summary className="num cursor-pointer list-none border-b border-dashed border-ink hover:text-accent">
        {unit === "percent" ? `${t.value * 100}%` : `${t.value}년`}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 border border-ink bg-paper p-3 text-xs leading-relaxed shadow-sm print:static print:w-auto" role="note">
        <p className="text-muted">{t.label}</p>
        <ul className="mt-2 space-y-1">{t.steps.map(s => <li key={s}>{s}</li>)}</ul>
        <ul className="mt-3 space-y-2 border-t border-line pt-2">{t.basis.map((b, index) => (
          <li key={index}>{b.kind === "law" ? <a className="underline" href={b.url} target="_blank" rel="noreferrer">{b.law} {b.article} · {b.appliesTo} · 확인 {b.confirmedAt}</a>
            : b.kind === "official" ? <a href={b.url} className="underline">{b.source}</a> : `가정: ${b.description}`}</li>
        ))}</ul>
      </div>
    </details>
  );
}
