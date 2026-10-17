"use client";

import { DISCLAIMER } from "@/lib/catalog";
import type { Traced } from "@/lib/tax/trace";
import { type ChecklistInput, type ItemId, type ItemStatus, STATUSES } from "@/lib/tax/filing-checklist/input";
import type { ChecklistResult as Result } from "@/lib/tax/filing-checklist/engine";

/** 서류의 개수에는 원 단위를 붙이지 않는다. 공용 Traced의 과정·근거를 그대로 표시한다. */
function TraceCount({ t, caption }: { t: Traced; caption?: string }) {
  return <details className="group relative inline-block text-left print:block">
    <summary aria-label={`${t.label} 근거 보기`} className="cursor-pointer list-none border-b border-dashed border-ink text-sm hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4">{caption ?? <><span className="num text-xl">{t.value}</span> 묶음</>}</summary>
    <div className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-3rem)] border border-ink bg-paper p-4 text-xs leading-relaxed shadow-sm print:static print:w-auto print:border-0 print:p-0">
      <p className="font-medium">{t.label}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">{t.steps.map(step => <li key={step}>{step}</li>)}</ul>
      <ul className="mt-3 space-y-2 border-t border-line pt-2">{t.basis.map((basis, n) => <li key={n}>{basis.kind === "law" ? <a className="underline underline-offset-2" href={basis.url} target="_blank" rel="noreferrer">{basis.law} {basis.article} · {basis.appliesTo} (확인 {basis.confirmedAt})</a> : basis.kind === "assumption" ? `가정: ${basis.description}` : <a className="underline" href={basis.url}>{basis.source}</a>}</li>)}</ul>
    </div>
  </details>;
}

export function ChecklistResult({ input, result: r, onStatus }: { input: ChecklistInput; result: Result; onStatus?: (id: ItemId, status: ItemStatus) => void }) {
  return <div>
    <header className="border-y border-ink py-5">
      <h2 className="text-xl">{r.pending.value > 0 ? "준비할 서류를 확인하세요" : r.unnecessary.value > 0 ? "불필요로 표시한 서류를 다시 확인하세요" : "표시된 서류를 모두 준비했습니다"}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">묶음 단위의 준비 현황입니다. 신고가 완성되었거나 제출의무를 모두 이행했다는 뜻은 아닙니다.</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">{[["전체", r.total], ["준비 완료", r.ready], ["미준비", r.pending], ["불필요 표시", r.unnecessary]].map(([label, t]) => <div key={String(label)}><dt className="mb-1 text-xs text-muted">{String(label)}</dt><dd><TraceCount t={t as Traced} /></dd></div>)}</dl>
    </header>
    <p className="mt-5 text-xs leading-relaxed text-muted">서류명을 읽고 준비 상태를 바꾸세요. 「근거」를 열면 적용 이유와 법제처 원문을 확인할 수 있습니다.</p>
    <ul className="mt-2 divide-y divide-line">
      {r.items.map(item => <li key={item.id} className="py-5 print:break-inside-avoid">
        <div className="flex items-start justify-between gap-5"><div><p className="text-xs text-muted">{item.kind}</p><h3 className="mt-1 text-base font-medium">{item.title}</h3></div><div className="shrink-0"><TraceCount t={item.trace} caption="근거" /></div></div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{item.detail}</p>
        {onStatus ? <div className="mt-3"><label className="sr-only" htmlFor={`status-${item.id}`}>{item.title} 준비 상태</label><select id={`status-${item.id}`} value={input.statuses[item.id] ?? "pending"} onChange={e => onStatus(item.id, e.target.value as ItemStatus)} className="border border-line bg-paper px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2">{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div> : <p className="mt-3 text-sm">상태: {STATUSES[item.status]}</p>}
        {!onStatus && <p className="mt-2 text-xs leading-relaxed text-muted">{item.trace.basis.filter(b => b.kind === "law").map((b, index) => b.kind === "law" && <a key={index} href={b.url} className="mr-3 underline underline-offset-2">{b.law} {b.article}</a>)}{item.kind === "준비자료" && "실무 대조용 준비자료 · Josh 감수 필요"}</p>}
        {item.status === "unnecessary" && <p className="mt-2 text-xs leading-relaxed text-warn">직접 불필요로 표시했습니다. 법적 제출의무의 면제가 아닙니다. Josh 감수 필요.</p>}
      </li>)}
    </ul>
    <section className="mt-8 border-t border-ink pt-5 text-sm leading-relaxed"><h2 className="text-xl">전제와 미반영</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-muted">{r.notes.map(note => <li key={note}>{note}</li>)}</ul></section>
    <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
  </div>;
}
