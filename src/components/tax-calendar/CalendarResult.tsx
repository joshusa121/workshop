"use client";

import { DISCLAIMER } from "@/lib/catalog";
import type { CalendarResult as Result } from "@/lib/tax/tax-calendar/engine";
import { CalendarTrace } from "./CalendarTrace";

export function CalendarResult({ result: r }: { result: Result }) {
  return <div>
    <header className="border-b-2 border-ink pb-6">
      <p className="text-sm text-muted"><CalendarTrace t={r.year} text={`${r.year.value}년`} />에 확인할 일정</p>
      <p className="mt-3 text-4xl"><CalendarTrace t={r.count} text={`${r.count.value}건`} /></p>
      <p className="mt-3 text-sm leading-relaxed text-muted">신고·납부와 조건부 확인 일정을 함께 센 건수입니다. 밑줄 친 날짜나 숫자를 누르면 계산 과정과 법령 근거를 볼 수 있습니다.</p>
    </header>
    <p className="mt-5 border-l-2 border-warn pl-4 text-sm leading-relaxed text-warn">휴일 이연 전 <strong className="font-medium">법정 명목일</strong>입니다. 실제 기한은 고지서·홈택스·위택스로 확인하세요.</p>
    <ol className="mt-8">
      {r.events.map(e=><li key={e.id} className="grid gap-3 border-b border-line py-6 sm:grid-cols-[7.5rem_minmax(0,1fr)] print:break-inside-avoid">
        <div className="text-xl">
          <CalendarTrace t={e.trace} text={e.date ? `${Number(e.date.slice(5,7))}월 ${Number(e.date.slice(8,10))}일` : e.timing!} />
        </div>
        <div>
          <p className="text-base font-medium">{e.title}{e.conditional && <span className="ml-2 text-xs font-normal text-warn">해당 시</span>}</p>
          <p className="mt-1 text-xs text-muted"><CalendarTrace t={{...e.trace,label:`${e.title} 귀속·대상기간`}} text={e.period}/></p>
          {e.startsOn && <p className="mt-2 text-xs text-muted">납기·신고기간 시작 <CalendarTrace t={{...e.trace,label:`${e.title} 기간 시작`,value:Number(e.startsOn.replaceAll("-",""))}} text={`${Number(e.startsOn.slice(5,7))}월 ${Number(e.startsOn.slice(8,10))}일`} /></p>}
          <p className="mt-2 text-sm leading-relaxed text-muted">{/[0-9]/.test(e.note) ? <CalendarTrace t={e.trace} text={e.note}/> : e.note}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {e.trace.basis.map((b,i)=>b.kind === "law" ? <a key={i} href={b.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-ink">{b.law} {b.article}</a> : null)}
          </div>
        </div>
      </li>)}
    </ol>
    <section className="mt-10 text-sm leading-relaxed">
      <h2 className="text-xl">전제와 미반영</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-muted">{r.notes.map(n=><li key={n}>{n}</li>)}</ul>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
    </section>
  </div>;
}
