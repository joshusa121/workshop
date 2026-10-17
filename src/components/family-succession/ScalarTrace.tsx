import type { Traced } from "@/lib/tax/trace";

/** 기간·연령·비율은 원 단위 공용 TraceValue 대신 단위와 근거를 함께 표시한다. */
export function ScalarTrace({ t, unit }: { t: Traced; unit: string }) {
  return (
    <details className="relative inline-block text-left">
      <summary className="cursor-pointer list-none border-b border-dashed border-ink text-sm hover:text-accent" aria-label={`${t.label} 근거`}>
        {unit === "확인" ? "판정 근거" : `${t.value.toLocaleString("ko-KR")}${unit}`}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-2.5rem)] border border-ink bg-paper p-3 text-xs leading-relaxed shadow-sm">
        <p className="font-medium">{t.label}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">{t.steps.map(s => <li key={s}>{s}</li>)}</ul>
        <ul className="mt-3 space-y-2 border-t border-line pt-2">
          {t.basis.map((b, index) => <li key={index}>{b.kind === "law" ? <a className="underline" href={b.url} target="_blank" rel="noreferrer">{b.law} {b.article} · 확인 {b.confirmedAt}</a> : b.kind === "assumption" ? `가정: ${b.description}` : <a className="underline" href={b.url}>{b.source}</a>}</li>)}
        </ul>
      </div>
    </details>
  );
}
