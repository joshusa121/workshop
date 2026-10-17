"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import { traced, type Traced } from "@/lib/tax/trace";
import type { FamilyPayrollInput } from "@/lib/tax/family-payroll/input";
import type { FamilyPayrollResult } from "@/lib/tax/family-payroll/engine";
import { INPUT_BASIS } from "@/lib/tax/family-payroll/rates";

function Row({ label, t, note, strong = false }: { label: string; t: Traced; note?: string; strong?: boolean }) {
  return <div className={`flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b py-3 text-sm ${strong ? "border-ink" : "border-line"}`}>
    <div><p>{label}</p>{note && <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{note}</p>}</div>
    <div className={`ml-auto shrink-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0 ${strong ? "text-lg" : ""}`}><TraceValue t={t} /></div>
  </div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-9"><h2 className="text-xl">{title}</h2><div className="mt-4 border-t border-ink">{children}</div></section>;
}
const checkText = { yes: "확인", no: "미충족", unknown: "미확인" };
export function FamilyResult({ input, result: r }: { input: FamilyPayrollInput; result: FamilyPayrollResult }) {
  const given = (label: string, value: number) => traced(label, value, ["사용자가 입력한 연간 금액"], [INPUT_BASIS]);
  return <div className="min-w-0">
    <div className="border-b-2 border-ink pb-6">
      <p className="text-sm text-muted">가족 고용 후 가계의 연간 변화</p>
      {r.netSaving ? <>
        <p className="mt-3 text-sm">{r.netSaving.value < 0 ? "가계 부담 증가 추정" : "가계 순절약 추정"}</p>
        <div className={`num mt-2 text-3xl sm:text-4xl [&_[role=dialog]]:left-0 [&_[role=dialog]]:right-auto ${r.netSaving.value < 0 ? "text-accent" : ""}`}><TraceValue t={r.netSaving} /></div>
        <p className="mt-3 text-xs leading-relaxed text-muted">음수는 보험·직원 세금이 사업주 세금 감소보다 크다는 뜻입니다. 급여 자체는 가족 안의 이전이므로 순절약에서 다시 빼지 않습니다.</p>
      </> : <>
        <h2 className="mt-3 text-balance text-2xl">절약액 판정 보류</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-warn">{r.reviewReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        <p className="mt-4 text-sm leading-relaxed">아래는 비용 인정과 단일 근로소득을 가정한 계산입니다. 실제 절약액으로 사용하지 마세요.</p>
      </>}
      <p className="mt-4 text-sm leading-relaxed text-warn">필요경비 인정과 가족 근로자성은 Josh 감수 필요. 확인 항목을 모두 체크해도 법적 인정이 확정되지는 않습니다.</p>
    </div>
    <Section title="누가, 어떤 일을 하나요">
      <dl className="space-y-2 py-4 text-sm leading-relaxed">
        <div className="flex justify-between gap-4"><dt>고용할 가족</dt><dd>{input.relation === "spouse" ? "배우자" : "자녀"} · {input.livingTogether ? "동거" : "별거"}</dd></div>
        <div className="flex justify-between gap-4"><dt>실제 근무 / 급여 적정성 / 지급 증빙</dt><dd>{checkText[input.actualWork]} / {checkText[input.reasonablePay]} / {checkText[input.evidence]}</dd></div>
        <div className="flex justify-between gap-4"><dt>보험별 적용·금액 확인</dt><dd>{input.insuranceConfirmed ? "확인" : "미확인"}</dd></div>
        <div className="flex justify-between gap-4"><dt>이 급여만 있고 고용 전 본인부담 보험료 없음</dt><dd>{input.onlySalary ? "확인" : "미확인·다른 조건"}</dd></div>
        <div className="flex justify-between gap-4"><dt>사업주가 고용 전 가족 기본공제 적용</dt><dd>{input.wasDependent ? "적용했음" : "적용하지 않음"}</dd></div>
      </dl>
      <Row label="연간 과세 총급여" t={given("연간 과세 총급여", input.salary)} />
      <Row label="사업주 부담 보험료 증가액" t={given("사업주 보험료 증가액", input.employerPremium)} />
      <Row label="직원 국민연금 부담액" t={given("직원 국민연금", input.workerPension)} />
      <Row label="직원 건강·장기요양·고용보험 부담액" t={given("직원 그 밖의 보험료", input.workerOtherPremium)} />
      <Row label="가계 보험 증가액 합계" t={r.insuranceCost} strong />
    </Section>
    <Section title="사업주의 세금은 얼마나 줄까요">
      <p className="py-3 text-xs leading-relaxed text-muted">과세표준은 소득에서 공제를 뺀, 세금을 매기는 기준 금액입니다. 연 매출·통장 잔액과 다릅니다. 사업주 세금은 세액공제·감면 변동 전 산출세액으로 비교합니다.</p>
      <Row label="고용 전 사업주 과세표준" t={given("고용 전 과세표준", input.businessTaxBase)} />
      <Row label="요건 확인을 전제로 한 필요경비" t={r.expense} note="총급여와 경비로 인정되는 사업주 보험료" />
      <Row label="사업주가 잃는 가족 기본공제" t={r.lostDependentDeduction} note="종전에 적용한 기본공제만 검토" />
      <Row label="고용 후 과세표준 가정" t={r.baseAfter} />
      <Row label="고용 전 소득세 산출세액" t={r.businessTaxBefore} />
      <Row label="고용 후 소득세 산출세액 가정" t={r.businessTaxAfter} />
      {r.businessTaxSaving && <Row label="사업주 소득세 감소 추정" t={r.businessTaxSaving} strong />}
      {r.localTaxSaving && <Row label="사업주 지방소득세 감소 추정" t={r.localTaxSaving} />}
    </Section>
    <Section title="직원인 가족의 세금도 계산합니다">
      <p className="py-3 text-xs leading-relaxed text-muted">사업주에게는 급여가 사업 비용이고, 가족 직원에게는 근로소득입니다. 근로소득공제는 급여에 정해진 기준을 적용해 소득에서 빼는 금액이며, 세액공제는 계산된 세금에서 빼는 금액입니다.</p>
      <Row label="직원 근로소득공제" t={r.salaryDeduction} />
      <Row label="직원 근로소득금액" t={r.wageIncome} />
      <Row label="직원 과세표준" t={r.wageBase} note={r.deductionMethod === "standard" ? "표준세액공제 방식 선택" : "보험료 특별소득공제 방식 선택"} />
      <Row label="직원 소득세 산출세액" t={r.wageGrossTax} />
      <Row label="직원 근로소득세액공제" t={r.wageCredit} />
      <Row label="직원 표준세액공제" t={r.standardCredit} />
      <Row label="직원 연간 소득세 추정" t={r.wageTax} strong />
      <Row label="직원 연간 지방소득세 추정" t={r.wageLocalTax} />
    </Section>
    <section className="mt-10 border-l-2 border-accent pl-5"><h2 className="text-xl">보험 가입은 별도로 확인하세요</h2><p className="mt-3 text-sm leading-relaxed">배우자·자녀가 함께 산다고 해서 모든 보험에서 제외되거나 자동 가입되는 것은 아닙니다. 실제 지휘·감독, 임금 지급, 다른 직원과의 근무 형태를 바탕으로 공단에 확인하고 금액을 입력하세요. 고용·산재 근로자성은 Josh 감수 필요입니다.</p></section>
    <section className="mt-10 border-t border-line pt-5"><h2 className="text-lg">전제와 미반영</h2><p className="mt-3 text-xs text-muted">금액의 밑줄을 누르면 계산 과정과 법령 근거가 열립니다.</p><ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-relaxed text-muted">{r.notes.map(note => <li key={note}>{note}</li>)}</ul><p className="mt-6 text-xs leading-relaxed text-muted">{DISCLAIMER}</p></section>
  </div>;
}
