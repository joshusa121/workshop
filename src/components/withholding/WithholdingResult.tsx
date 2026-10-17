"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { WithholdingResult as Result } from "@/lib/tax/withholding/engine";
import { KIND_LABELS, OTHER_LABELS, type WithholdingInput } from "@/lib/tax/withholding/input";
import type { Traced } from "@/lib/tax/trace";

function Row({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return <div className={`flex items-baseline justify-between gap-4 border-b py-3 text-sm ${strong ? "border-ink" : "border-line"}`}>
    <span>{label}</span><div className="max-w-[70%] text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0">{children}</div>
  </div>;
}

/** 금액용 공용 TraceValue와 달리 % 단위를 명시한다. */
function Percent({ t }: { t: Traced }) {
  return <details className="relative inline-block text-right">
    <summary aria-label={t.label} className="num cursor-pointer list-none border-b border-dashed border-ink">{t.value}%</summary>
    <div className="absolute right-0 z-20 mt-2 w-64 border border-ink bg-paper p-3 text-left text-xs leading-relaxed shadow-sm">
      <p>{t.label}</p>
      {t.steps.map((s) => <p className="mt-2" key={s}>{s}</p>)}
      {t.basis.map((b, i) => b.kind === "law" ? <a key={i} href={b.url} target="_blank" rel="noreferrer" className="mt-2 block underline">{b.law} {b.article}: {b.appliesTo} (확인 {b.confirmedAt})</a> : null)}
    </div>
  </details>;
}

export function WithholdingResult({ input, result: r }: { input: WithholdingInput; result: Result }) {
  return <div>
    <div className="border-b border-ink pb-6">
      <p className="text-sm text-muted">상대방에게 실제로 지급할 금액</p>
      <div className="num mt-3 text-2xl sm:text-4xl [&_[role=dialog]]:left-0 [&_[role=dialog]]:right-auto"><TraceValue t={r.net} /></div>
      <div className="mt-4 text-sm leading-relaxed"><p>세금으로 떼어 둘 금액</p><div className="mt-1 [&_[role=dialog]]:left-0 [&_[role=dialog]]:right-auto"><TraceValue t={r.total} /></div><p className="mt-2">{r.reason}</p></div>
    </div>

    <section className="mt-10">
      <h2 className="text-xl">지급액부터 차례로 계산</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">밑줄 친 숫자를 누르면 계산 과정과 근거 조문이 열립니다.</p>
      <div className="mt-4 border-t border-ink">
        <Row label="소득 종류">{KIND_LABELS[input.kind]}</Row>
        {input.kind === "other" && <Row label="기타소득 세부 종류">{OTHER_LABELS[input.otherCategory]}</Row>}
        <Row label="세전 지급액"><TraceValue t={r.gross} /></Row>
        {input.kind === "other" && <>
          <Row label="정률 필요경비율"><Percent t={r.expenseRate} /></Row>
          <Row label="차감할 필요경비"><TraceValue t={r.expenses} /></Row>
        </>}
        <Row label="세금 계산 기준금액"><TraceValue t={r.taxable} /></Row>
        <Row label="소득세 원천징수세율"><Percent t={r.nationalRate} /></Row>
        <Row label="원천징수 소득세"><TraceValue t={r.national} /></Row>
        <Row label="지방소득세율 (소득세 대비)"><Percent t={r.localRate} /></Row>
        <Row label="특별징수 지방소득세"><TraceValue t={r.local} /></Row>
        <Row label="떼어 둘 세금 합계"><TraceValue t={r.total} /></Row>
        <Row label="상대방에게 지급할 금액" strong><TraceValue t={r.net} /></Row>
      </div>
      {input.kind === "other" && <p className="mt-3 text-xs leading-relaxed text-muted">필요경비는 세금 계산에서만 빼는 금액입니다. 실제 지급액에서는 빼지 않습니다. 경비 표시에는 원 단위 반올림이 있을 수 있고, 계산 과정에서는 원 미만을 유지합니다.</p>}
    </section>

    <section className="mt-10 border-t border-ink pt-5">
      <h2 className="text-xl">떼어 둔 세금은 언제 내나요?</h2>
      <p className="mt-3 text-sm">지급일 {input.paidAt} · {input.paymentCycle === "halfYearApproved" ? "반기납부 승인·지정 받은 경우" : "매월 납부"}</p>
      <details className="mt-3 text-sm">
        <summary className="w-fit cursor-pointer border-b border-dashed border-ink">납부 기준일 <span className="num">{r.deadline.date}</span></summary>
        <ul className="mt-3 space-y-2 border-l border-line pl-3 text-xs leading-relaxed">
          {r.deadline.basis.map((b, i) => b.kind === "law" ? <li key={i}><a href={b.url} target="_blank" rel="noreferrer" className="underline">{b.law} {b.article}</a>: {b.appliesTo}</li> : null)}
        </ul>
      </details>
      <p className="mt-3 text-sm leading-relaxed text-warn">공휴일·토요일 등에 따른 연장 전의 법정 기준일입니다. 실제 신고·납부일은 홈택스·위택스에서 확인해 주세요. 세액이 없어도 신고가 필요할 수 있습니다.</p>
    </section>

    <section className="mt-10 text-sm leading-relaxed">
      <h2 className="text-xl">전제와 미반영</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
        <li>국내 거주자 개인에게 지급하는 일반적인 소득의 원천징수만 계산합니다. 연말정산·종합소득세 신고 후 최종 세금은 달라질 수 있습니다.</li>
        <li>사업소득은 계속·반복적으로 제공하는 부가가치세 면세 인적용역을 사업자 등이 지급하는 경우로 한정합니다. 모든 사업 매출에 원천세가 붙는 것은 아닙니다.</li>
        <li>기타소득은 일시적 인적용역·순위 경쟁대회 입상 상금·사례금으로 한정합니다. 한 계약·지급 원인별로 입력하며, 나눠 지급해 과세최저한을 중복 적용하지 않습니다.</li>
        <li>실제 경비의 증빙·통상성, 사업소득과 기타소득 구분, 경쟁대회 요건 충족 여부는 Josh 감수 필요입니다.</li>
        <li>반기납부는 승인을 받거나 지정된 경우에만 선택합니다. 인원 등 요건만으로 자동 적용되지 않습니다. 소득처분 배당·상여 등은 이 계산에서 제외합니다.</li>
        <li>근로소득 간이세액표, 비거주자·법인 수령자, 외국인 직업운동가, 비영업대금 이자, 출자공동사업자 배당, 복권·연금·종교인·가상자산·서화 소득, 비과세·감면·조약·외국납부세액공제·가산세·특례세율은 미반영입니다.</li>
        <li>세법 확인일 현재 법령을 기준으로 한 해당 연도 추정치입니다. 개정 전 지급분의 적용시기, 한 건의 경비·과세최저한 판정, 납부서 단위 끝수와 합산 방식은 Josh 감수 필요입니다.</li>
      </ul>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
    </section>
  </div>;
}
