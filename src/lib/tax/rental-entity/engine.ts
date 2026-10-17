import { applyBrackets } from "@/lib/tax/progressive";
import { floorWon, floorTenWon } from "@/lib/tax/rounding";
import { traced, type Traced } from "@/lib/tax/trace";
import type { Basis } from "@/lib/tax/sources";
import { validateInput, type RentalInput } from "./input";
import { INCOME_BRACKETS, LOCAL_INCOME_BRACKETS, corporateBrackets, RENTAL_RULES, INCOME_BASIS, SEPARATE_BASIS, REGISTERED_BASIS, SMALL_BASIS, MODEL_BASIS, ROUND_BASIS, LOCAL_ROUND_BASIS, LOCAL_PERSONAL_BASIS, DIVIDEND_BASIS, LOCAL_DIVIDEND_BASIS, FINANCIAL_LIMIT, DIVIDEND_RATE } from "./rates-2026";

function amount(label: string, value: number, steps: string[], basis: Basis[]): Traced {
  return traced(label, value, steps, [...new Set([...basis, MODEL_BASIS])]);
}
function sum(label: string, parts: Traced[]) {
  return amount(label, parts.reduce((n, p) => n + p.value, 0), parts.map(p => `${p.label}: ${p.value.toLocaleString("ko-KR")}원`), parts.flatMap(p => p.basis).filter((b, i, a) => a.indexOf(b) === i));
}
function withholding(dividend: number) {
  const national = floorTenWon(dividend * DIVIDEND_RATE.value);
  return { national, local: floorTenWon(national / 10) };
}
export function computeRental(input: RentalInput) {
  const errors = validateInput(input);
  if (errors.length) throw new Error(errors.join(" "));
  const rules = RENTAL_RULES.value;
  const revenue = amount("연 임대 총수입", input.revenue, ["사용자가 입력한 과세대상 총수입금액. 보증금 간주임대료는 별도 산정 후 포함해야 합니다."], [MODEL_BASIS]);
  const expenses = amount("연 필요경비", input.expenses, ["사용자가 입력한 세법상 인정 경비. 감가상각·이자·세무조정 검토는 Josh 감수 필요."], [MODEL_BASIS]);
  const profit = amount("경비를 뺀 임대이익", floorWon(input.revenue - input.expenses), [`${input.revenue} − ${input.expenses}, 적자는 0으로 제한(결손금 효과 미반영)`], [MODEL_BASIS]);
  const baseline = floorWon(input.otherIncome - rules.basic);
  const base = amount("임대 포함 종합소득 과세표준", floorWon(input.otherIncome + profit.value - rules.basic), [`다른 종합소득금액 ${input.otherIncome} + 임대이익 ${profit.value} − 본인 기본공제 ${rules.basic}, 최소 0`], [INCOME_BASIS, ROUND_BASIS]);
  const progressive = (local: boolean) => {
    const table = local ? LOCAL_INCOME_BRACKETS : INCOME_BRACKETS;
    const total = applyBrackets(base.value, table, "임대 포함 산출세액", floorTenWon);
    const before = applyBrackets(baseline, table, "임대 전 산출세액", floorTenWon);
    return amount(local ? "종합과세 지방소득세 증가액" : "종합과세 소득세 증가액", total.value - before.value, [...total.steps, `임대 전 세액 ${before.value} 차감. 세액공제·감면 전`], [table.basis, local ? LOCAL_ROUND_BASIS : ROUND_BASIS]);
  };
  const comprehensiveNational = progressive(false);
  const comprehensiveLocal = progressive(true);
  const eligible = input.kind === "housing" && input.revenue <= rules.limit;
  const separateBase = eligible ? amount("분리과세 기준 금액", floorWon(input.revenue * (100 - (input.registered ? rules.registeredExpense : rules.expense)) / 100 - (input.otherIncome <= rules.limit ? (input.registered ? rules.registeredAllowance : rules.allowance) : 0)), [
    `총수입 ${input.revenue} × (100 − ${input.registered ? rules.registeredExpense : rules.expense})%`,
    `임대 외 종합소득금액 ${input.otherIncome}이 ${rules.limit} 이하일 때만 ${input.registered ? rules.registeredAllowance : rules.allowance} 추가 차감. 최소 0`,
  ], [SEPARATE_BASIS, REGISTERED_BASIS, ROUND_BASIS]) : null;
  const separateNational = separateBase ? amount("분리과세 소득세", floorTenWon(separateBase.value * rules.rate), [`기준 금액 ${separateBase.value} × 14%, 10원 미만 버림`], [SEPARATE_BASIS, ROUND_BASIS]) : null;
  const separateLocal = separateBase ? amount("분리과세 지방소득세", floorTenWon(separateBase.value * 14 / 1000), [`기준 금액 ${separateBase.value} × 1.4%, 10원 미만 버림`], [LOCAL_PERSONAL_BASIS, LOCAL_ROUND_BASIS]) : null;
  const useSeparate = separateNational !== null && separateLocal !== null && separateNational.value + separateLocal.value < comprehensiveNational.value + comprehensiveLocal.value;
  const personalNational = useSeparate ? separateNational! : comprehensiveNational;
  const personalLocal = useSeparate ? separateLocal! : comprehensiveLocal;
  const personalTotal = sum("개인 임대로 늘어나는 세금 (공제 전)", [personalNational, personalLocal]);
  const corpNational = applyBrackets(profit.value, corporateBrackets(input.smallCorp, false), "법인세", floorTenWon);
  corpNational.basis.push(SMALL_BASIS, ROUND_BASIS, MODEL_BASIS);
  const corpLocal = applyBrackets(profit.value, corporateBrackets(input.smallCorp, true), "법인지방소득세", floorTenWon);
  corpLocal.basis.push(SMALL_BASIS, LOCAL_ROUND_BASIS, MODEL_BASIS);
  const afterCorp = profit.value - corpNational.value - corpLocal.value;
  const dividend = amount("주주에게 지급하는 세전 배당", floorWon(afterCorp * input.dividendPercent / 100), [`법인세·지방세 후 ${afterCorp} × 배당 비율 ${input.dividendPercent}%`], [DIVIDEND_BASIS]);
  const w = withholding(dividend.value);
  const dividendNational = amount("배당 소득세 원천징수", w.national, [`배당 ${dividend.value} × 14%, 10원 미만 버림. 종합과세 시 최종세액 아님`], [DIVIDEND_BASIS, ROUND_BASIS]);
  const dividendLocal = amount("배당 지방소득세 특별징수", w.local, [`원천징수 소득세 ${w.national} × 10%, 10원 미만 버림`], [LOCAL_DIVIDEND_BASIS, LOCAL_ROUND_BASIS]);
  const corporateTotal = sum("법인세와 배당 원천징수 합계", [corpNational, corpLocal, dividendNational, dividendLocal]);
  const retained = amount("법인에 남는 돈", afterCorp - dividend.value, [`법인 세후이익 ${afterCorp} − 세전 배당 ${dividend.value}. 개인이 바로 쓸 수 없는 법인 자금`], [MODEL_BASIS]);
  const shareholderNet = amount("주주가 받는 배당 실수령액", dividend.value - w.national - w.local, [`배당 ${dividend.value} − 소득세 ${w.national} − 지방세 ${w.local}`], [DIVIDEND_BASIS, LOCAL_DIVIDEND_BASIS]);
  const comparable = input.otherFinancial + dividend.value <= FINANCIAL_LIMIT.value;
  const difference = amount("법인 쪽 세금 − 개인 쪽 세금", corporateTotal.value - personalTotal.value, [`${corporateTotal.value} − ${personalTotal.value}. 양수면 개인 쪽 세금이 적음. 금융소득 종합과세 대상이면 최종 비교에 사용하지 않음`], [...corporateTotal.basis, ...personalTotal.basis]);
  return { revenue, expenses, profit, base, comprehensiveNational, comprehensiveLocal, separateBase, separateNational, separateLocal, personalNational, personalLocal, personalTotal, personalMode: useSeparate ? "분리과세" : "종합과세", corpNational, corpLocal, dividend, dividendNational, dividendLocal, corporateTotal, retained, shareholderNet, comparable, difference };
}
export type RentalResult = ReturnType<typeof computeRental>;
export type Breakpoint = { status: "crossing"; amount: Traced } | { status: "personal" | "outside" };
/** 임대 수입·경비를 고정하고, 배당금이 늘어날 때 최초로 법인 합계가 개인 이상이 되는 지점. */
export function dividendBreakpoint(r: RentalResult, otherFinancial: number): Breakpoint {
  const corp = r.corpNational.value + r.corpLocal.value;
  if (corp >= r.personalTotal.value) return { status: "personal" };
  const cap = Math.max(0, Math.min(r.profit.value - corp, FINANCIAL_LIMIT.value - otherFinancial));
  const reaches = (n: number) => { const w = withholding(n); return corp + w.national + w.local >= r.personalTotal.value; };
  if (!reaches(cap)) return { status: "outside" };
  let low = 0, high = cap;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (reaches(mid)) high = mid; else low = mid + 1;
  }
  return { status: "crossing", amount: amount("세전 배당금 분기점", low, [`수입·경비 고정. 배당 ${low}원에서 법인세 + 지방세 + 배당 징수액이 개인 세금 이상이 되는 첫 금액`, `다른 금융소득 ${otherFinancial}원, 합계 ${FINANCIAL_LIMIT.value}원 이하 범위에서만 탐색. 유보금의 미래 인출 세금 미반영`], [DIVIDEND_BASIS, LOCAL_DIVIDEND_BASIS, ...r.personalTotal.basis]) };
}
