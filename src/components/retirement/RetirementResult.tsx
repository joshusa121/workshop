"use client";

import type { ReactNode } from "react";
import { DISCLAIMER } from "@/lib/catalog";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import type { RetirementResult as Result } from "@/lib/tax/retirement/engine";
import type { RetirementInput } from "@/lib/tax/retirement/input";
import type { Traced } from "@/lib/tax/trace";

function Row({ label, note, t, strong }: { label: string; note?: string; t: Traced; strong?: boolean }) {
  return <div className={`flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b py-3 text-sm ${strong ? "border-ink" : "border-line"}`}>
    <div><p>{label}</p>{note && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{note}</p>}</div>
    <div className={`shrink-0 [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0 ${strong ? "text-lg" : ""}`}><TraceValue t={t} /></div>
  </div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-10"><h2 className="text-xl">{title}</h2><div className="mt-4 border-t border-ink">{children}</div></section>;
}

export function RetirementResult({ input, result: r }: { input: RetirementInput; result: Result }) {
  const hasExcess = r.employmentIncome.value > 0;
  return <div className="break-keep text-pretty">
    <div className="border-b border-ink pb-6">
      <p className="text-sm text-muted">퇴직소득에 대한 세금 합계</p>
      <p className="num mt-3 text-4xl [&_[role=dialog]]:text-xs"><TraceValue t={r.total} /></p>
      <p className="mt-4 text-sm leading-relaxed">퇴직소득세와 지방소득세를 합한 예상 원천징수액입니다. 한 번에 일시금으로 수령하는 경우를 계산합니다.</p>
      <p className="mt-3 text-sm">퇴직소득분 세후 금액 <span className="ml-2"><TraceValue t={r.netRetirement} /></span></p>
    </div>

    {hasExcess && <div className="mt-6 border-l-2 border-accent bg-paper px-4 py-3 text-sm leading-relaxed text-accent">
      <p>임원 한도를 넘는 <TraceValue t={r.employmentIncome} />은 근로소득으로 봅니다.</p>
      <p className="mt-2">이 금액에 대한 근로소득세는 위 세금 합계에 포함되지 않았습니다. 전체 지급액의 최종 실수령액은 Josh 감수 후 확인해 주세요.</p>
    </div>}

    <Section title="입력과 퇴직소득 범위">
      <Row label="비과세를 제외한 지급액" t={r.amount} />
      <details className="border-b border-line py-3 text-sm">
        <summary className="cursor-pointer">세금 계산에 쓰는 근속연수 <span className="num ml-2 border-b border-dashed border-ink">{r.serviceYears.value}년</span></summary>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
          {r.serviceYears.steps.map((s) => <p key={s}>{s}</p>)}
          {r.serviceYears.basis.map((b, k) => b.kind === "law" ? <p key={k}><a href={b.url} target="_blank" rel="noreferrer" className="underline">{b.law} {b.article}</a> — {b.appliesTo}</p> : null)}
        </div>
      </details>
      {input.isExecutive && <>
        <Row label="2011년 이전 근무분" note="전체 지급액에서 근무월수에 비례해 나눈 금액" t={r.pre2012Income} />
        <Row label="2012~2019년 근무분 한도" t={r.limit2012} />
        <Row label="2020년 이후 근무분 한도" t={r.limit2020} />
        {r.executiveLimit && <Row label="퇴직소득으로 인정하는 한도" t={r.executiveLimit} />}
        <Row label="근로소득으로 보는 초과액" note="근로소득세는 별도 정산 필요" t={r.employmentIncome} />
      </>}
      <Row label="퇴직소득으로 계산하는 금액" t={r.retirementIncome} strong />
    </Section>

    <Section title="공제에서 세금까지">
      <p className="py-3 text-xs leading-relaxed text-muted">밑줄 친 숫자를 누르면 계산 과정과 조문을 볼 수 있습니다. 환산급여는 오랜 기간 쌓인 퇴직금을 근속기간에 맞춰 세금 계산용으로 바꾼 금액입니다.</p>
      <Row label="근속연수공제" note="근무한 기간에 따라 빼주는 금액" t={r.serviceDeduction} />
      <Row label="환산급여" note="근속연수공제 후, 근속연수로 나누고 연간 기준으로 환산" t={r.convertedPay} />
      <Row label="환산급여공제" note="환산급여 구간에 따라 추가로 빼주는 금액" t={r.convertedDeduction} />
      <Row label="환산 과세표준" note="세율을 적용하는 기준 금액" t={r.taxBase} />
      <Row label="환산 산출세액" note="환산 과세표준에 기본 누진세율을 적용한 금액" t={r.convertedTax} />
      <Row label="퇴직소득 산출세액" note="환산 산출세액을 근속기간에 맞춰 되돌린 금액" t={r.assessedTax} />
      <Row label="퇴직소득세 원천징수액" note="소액 부징수 및 끝수 처리 후" t={r.tax} />
      <Row label="지방소득세" t={r.localTax} />
      <Row label="퇴직소득 관련 세금 합계" t={r.total} strong />
    </Section>

    <section className="mt-10 text-sm leading-relaxed">
      <h2 className="text-xl">전제와 미반영</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
        <li>2026년 귀속 거주자의 일반 퇴직금입니다. 지급액에서 비과세소득은 미리 제외해 입력합니다.</li>
        <li>전체 근속월수와 임원 구간별 근무월수는 퇴직급여 산정 제외기간을 차감하고 확인한 값으로 입력합니다. 월 미만은 올립니다.</li>
        <li>중간정산·합산정산·기납부세액·이연 퇴직금·공적연금 일시금은 반영하지 않습니다.</li>
        <li>연금계좌 이체에 따른 과세이연과 연금수령 시 과세는 반영하지 않습니다. 현재 즉시 납부할 세액을 뜻하지 않을 수 있습니다.</li>
        <li>임원 정관 배수 설계, 법인 비용 인정 한도, 한도 초과 근로소득의 세금은 별도 검토가 필요합니다.</li>
        <li>중간 계산의 소수는 유지하고 과세표준에서 원 미만을 버립니다. 세액은 끝수 처리를 거칩니다. 중간 소수 표시액을 다시 계산하면 차이가 날 수 있습니다.</li>
      </ul>
      <div className="mt-6 border border-warn px-4 py-3 text-warn"><p>Josh 감수 항목</p><ul className="mt-2 list-disc space-y-2 pl-5">{r.review.map((s) => <li key={s}>{s}</li>)}</ul></div>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
    </section>
  </div>;
}
