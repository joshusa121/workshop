"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { Traced } from "@/lib/tax/trace";
import type { LoanToOwnerInput } from "@/lib/tax/loan-to-owner/input";
import type { LoanToOwnerResult } from "@/lib/tax/loan-to-owner/engine";
import { CALCULATION_ASSUMPTION, INPUT_ASSUMPTION, OVERDRAFT_RATE, WEIGHTED_BASIS } from "@/lib/tax/loan-to-owner/rates-2026";
import { traced } from "@/lib/tax/trace";

function Row({ label, note, children, strong = false }: { label: string; note?: string; children: ReactNode; strong?: boolean }) {
  return <div className={`flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b py-3 text-sm ${strong ? "border-ink" : "border-line"}`}>
    <div><p>{label}</p>{note && <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{note}</p>}</div>
    <div className={`ml-auto shrink-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0 ${strong ? "text-lg" : ""}`}>{children}</div>
  </div>;
}

/** 원·일과 이자율은 금액용 TraceValue와 단위를 구분한다. */
export function LoanMeasure({ t, display }: { t: Traced; display: string }) {
  return <details className="relative inline-block text-left">
    <summary className="num cursor-pointer border-b border-dashed border-ink hover:text-accent">{display}</summary>
    <div className="absolute right-0 z-20 mt-2 w-64 max-w-[80vw] border border-ink bg-paper p-3 text-xs leading-relaxed shadow-sm">
      <p>{t.label}</p><ul className="mt-2 list-disc pl-4">{t.steps.map(s => <li key={s}>{s}</li>)}</ul>
      <ul className="mt-3 space-y-2 border-t border-line pt-2">{t.basis.map((b, i) => <li key={i}>{b.kind === "law" ? <a className="underline" href={b.url} target="_blank" rel="noreferrer">{b.law} {b.article} · {b.appliesTo} · 확인 {b.confirmedAt}</a> : b.kind === "assumption" ? `가정: ${b.description}` : <a href={b.url}>{b.source}</a>}</li>)}</ul>
    </div>
  </details>;
}

export function LoanResult({ input, result: r }: { input: LoanToOwnerInput; result: LoanToOwnerResult }) {
  const given = (label: string, value: number) => traced(label, value, ["사용자가 입력한 금액"], [INPUT_ASSUMPTION]);
  const rate = traced("적용 연이자율", r.ratePercent, [input.rateMode === "overdraft" ? "적용 요건 또는 신고 선택·구속기간을 확인한 당좌대출이자율" : "사용자가 확인해 입력한 가중평균차입이자율"], [input.rateMode === "overdraft" ? OVERDRAFT_RATE.basis : WEIGHTED_BASIS, INPUT_ASSUMPTION]);
  return <div className="min-w-0">
    <div className="border-b border-ink pb-6">
      <p className="text-sm text-muted">회사 세금 증가 추정</p>
      <p className="num mt-3 text-2xl sm:text-4xl [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0"><TraceValue t={r.totalCorpTaxIncrease} /></p>
      <p className="mt-4 text-sm leading-relaxed">회사가 받아야 할 이자와 비용에서 빠지는 차입금 이자를 반영한 법인세·법인지방소득세 산출세액의 증가분입니다.</p>
      <p className="mt-3 text-sm text-warn">개인 세금은 별도로 검토해야 합니다. Josh 최종 감수 대기.</p>
    </div>

    <section className="mt-9">
      <h2 className="text-xl">회사에 더해지는 이익</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">가지급금은 회사 돈을 개인 용도로 가져가 아직 갚지 않은 금액입니다. 숫자의 밑줄을 누르면 계산 과정과 근거가 열립니다.</p>
      <div className="mt-4 border-t border-ink">
        {input.periods.map((p, i) => <Row key={i} label={`기간 ${i + 1} 잔액`} note="서로 겹치지 않는 기간으로 입력">
          <TraceValue t={given("기간 잔액", p.balance)} /> <span className="text-muted">/ </span><LoanMeasure display={`${p.days}일`} t={traced("해당 잔액 유지 일수", p.days, ["사용자가 입력한 기간의 일수"], [CALCULATION_ASSUMPTION])} />
        </Row>)}
        <Row label="잔액에 일수를 곱한 합계 (적수)"><LoanMeasure t={r.balanceDays} display={`${r.balanceDays.value.toLocaleString("ko-KR")}원·일`} /></Row>
        <Row label="적용 연이자율"><LoanMeasure t={rate} display={`${r.ratePercent.toFixed(2)}%`} /></Row>
        <Row label="정상적으로 받아야 할 이자"><TraceValue t={r.normalInterest} /></Row>
        <Row label="실제 받은 이자"><TraceValue t={given("실제 이자", input.actualInterest)} /></Row>
        <Row label="정상 이자와의 차액"><TraceValue t={r.interestShortfall} /></Row>
        <Row label="이익에 더하는 이자 (인정이자)" note={r.thresholdApplies ? "차액 기준에 해당해 부족한 이자 전액을 반영" : "차액 기준 미달 또는 부족한 이자 없음"} strong><TraceValue t={r.recognizedInterest} /></Row>
      </div>
    </section>

    <section className="mt-10">
      <h2 className="text-xl">회사의 차입금 비용 제한</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">회사가 빌린 돈에 이자를 내면서 업무와 무관하게 돈을 빌려주면, 지급이자의 일부를 세금 계산상 비용으로 인정받지 못합니다(손금불산입).</p>
      <div className="mt-4 border-t border-ink">
        <Row label="연평균 차입금"><TraceValue t={given("연평균 차입금", input.averageBorrowings)} /></Row>
        <Row label="해당 차입금의 지급이자"><TraceValue t={given("차입금 지급이자", input.borrowingInterest)} /></Row>
        <Row label="비용으로 인정되지 않는 이자" strong><TraceValue t={r.disallowedInterest} /></Row>
        <Row label="법인 과세소득 증가 합계"><TraceValue t={r.incomeAddition} /></Row>
      </div>
    </section>

    <section className="mt-10">
      <h2 className="text-xl">회사 세금의 변화</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">과세표준은 세금을 매기는 기준 금액입니다. 조정 전후에 각각 누진세율을 적용해 차이를 구합니다.</p>
      <div className="mt-4 border-t border-ink">
        <Row label="조정 전 법인 과세표준"><TraceValue t={given("법인 과세표준", input.corpTaxBase)} /></Row>
        <Row label="법인세 증가 추정"><TraceValue t={r.corpTaxIncrease} /></Row>
        <Row label="법인지방소득세 증가 추정"><TraceValue t={r.localTaxIncrease} /></Row>
        <Row label="회사 세금 증가 추정 합계" strong><TraceValue t={r.totalCorpTaxIncrease} /></Row>
      </div>
    </section>

    <section className="mt-10 border-l-2 border-accent pl-5">
      <h2 className="text-xl">개인에게는 {r.disposition} 검토</h2>
      <p className="mt-3 text-sm leading-relaxed">회사가 받은 것으로 더한 이익을 누구의 소득으로 볼지 정하는 것이 소득처분입니다. {input.recipient === "director" ? "대표이사·임직원은 주주 여부와 관계없이 상여로 분류합니다." : "임원·직원이 아닌 주주에게 귀속되면 배당으로 분류합니다."}</p>
      <div className="mt-3"><Row label="개인 소득처분 검토액"><TraceValue t={r.personalIncomeAddition} /></Row></div>
      <p className="mt-3 text-sm leading-relaxed text-warn">사외유출·귀속이 확정됐다는 전제입니다. 개인 최종 소득세와 지방소득세는 계산하지 않았습니다. 기존 급여·금융소득·공제와 이자 회수 내역을 함께 검토해야 합니다. Josh 감수 필요.</p>
    </section>

    <section className="mt-10 text-sm leading-relaxed">
      <h2 className="text-xl">전제와 미반영</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">{r.notes.map(n => <li key={n}>{n}</li>)}</ul>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
    </section>
  </div>;
}
