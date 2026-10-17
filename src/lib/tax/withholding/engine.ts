import { floorTenWon, floorWon } from "@/lib/tax/rounding";
import { traced } from "@/lib/tax/trace";
import { isCalendarDate, isWithholdingInput, type PaymentCycle, type WithholdingInput } from "./input";
import { BUSINESS_SCOPE_BASIS, DEADLINE_BASIS, DUTY_BASIS, EXPENSE_RATES, HALF_YEAR_BASIS, INPUT_BASIS, LOCAL_RATE, LOCAL_ROUNDING_BASIS, NATIONAL_RATES, OTHER_MINIMUM, ROUNDING_BASIS, SMALL_EXCEPTION_BASIS, SMALL_TAX } from "./rates";

/** 공휴일 연장 전의 법정 기준일. 휴일 조정은 별도 확인한다. */
export function paymentDeadline(paidAt: string, cycle: PaymentCycle): string {
  if (!isCalendarDate(paidAt)) throw new Error("지급일이 올바르지 않습니다");
  const [year, month] = paidAt.split("-").map(Number);
  const nextMonth = cycle === "halfYearApproved" ? (month <= 6 ? 7 : 13) : month + 1;
  return `${year + (nextMonth === 13 ? 1 : 0)}-${String(nextMonth === 13 ? 1 : nextMonth).padStart(2, "0")}-10`;
}

export function computeWithholding(input: WithholdingInput) {
  if (!isWithholdingInput(input)) throw new Error("입력한 소득 종류·금액·지급일을 확인해 주세요.");
  const { kind, gross, actualExpenses, otherCategory } = input;
  const nationalRate = NATIONAL_RATES[kind];
  const expenseRate = kind === "other" ? EXPENSE_RATES[otherCategory] : null;
  // 정률 경비 계산 중 원 미만은 유지한다. 과세최저한은 경비 차감 후 금액에 비교한다.
  const statutoryExpenses = gross * (expenseRate?.value ?? 0) / 100;
  const expenses = kind === "other" ? Math.max(statutoryExpenses, actualExpenses) : 0;
  const income = gross - expenses;
  const taxable = floorWon(income);
  const underMinimum = kind === "other" && income <= OTHER_MINIMUM.value;
  const rawNational = taxable * nationalRate.value / 100;
  // 이 계산기의 사업소득은 시행령 §149의3의 계속·반복적 면세 인적용역으로 한정한다.
  const smallWaived = !underMinimum && (kind === "other" || kind === "dividend") && rawNational < SMALL_TAX.value;
  const national = underMinimum || smallWaived ? 0 : floorTenWon(rawNational);
  const local = floorTenWon(national * LOCAL_RATE.value / 100);
  const taxBasis = [nationalRate.basis, ROUNDING_BASIS, SMALL_TAX.basis,
    ...(kind === "other" ? [OTHER_MINIMUM.basis] : []),
    ...(kind === "business" ? [BUSINESS_SCOPE_BASIS, SMALL_EXCEPTION_BASIS] : [])];
  const reason = underMinimum ? "건별 기타소득금액이 과세최저한 이하라 과세하지 않습니다."
    : smallWaived ? "소득세가 소액부징수 기준 미만이라 징수하지 않습니다."
    : "선택한 소득 종류의 일반 원천징수세율을 적용했습니다.";
  const expenseSteps = expenseRate
    ? [`지급액 ${gross.toLocaleString("ko-KR")}원 × 정률 필요경비 ${expenseRate.value}% = ${statutoryExpenses.toLocaleString("ko-KR")}원`, `실제 경비 ${actualExpenses.toLocaleString("ko-KR")}원과 비교하여 큰 금액 ${expenses.toLocaleString("ko-KR")}원 반영`]
    : ["사업·이자·배당은 지급액 전체에 원천징수세율 적용. 기타소득 경비 입력은 사용하지 않음"];
  return {
    gross: traced("세전 지급액", gross, ["사용자가 입력한 한 계약·지급 원인별 금액"], [INPUT_BASIS, DUTY_BASIS]),
    expenses: traced("필요경비", expenses, expenseSteps, expenseRate ? [expenseRate.basis, INPUT_BASIS] : [nationalRate.basis]),
    taxable: traced("세금 계산 기준금액", taxable, [`지급액 − 필요경비 = ${income.toLocaleString("ko-KR")}원`, "세금 계산 기준금액의 1원 미만 버림. 기타소득 과세최저한 비교에는 버리기 전 소득금액 사용"], [expenseRate?.basis ?? nationalRate.basis, ROUNDING_BASIS]),
    nationalRate: traced("국세 원천징수세율(%)", nationalRate.value, [`세금 계산 기준금액에 ${nationalRate.value}% 적용`], [nationalRate.basis]),
    expenseRate: traced("정률 필요경비율(%)", expenseRate?.value ?? 0, expenseRate ? [`${expenseRate.value}%의 정률 경비와 실제 경비 중 큰 금액 반영`] : ["이 소득에는 기타소득 정률 필요경비를 적용하지 않음"], [expenseRate?.basis ?? nationalRate.basis]),
    localRate: traced("지방소득세율(국세 대비 %)", LOCAL_RATE.value, [`원천징수 소득세의 ${LOCAL_RATE.value}%`], [LOCAL_RATE.basis]),
    national: traced("원천징수 소득세", national, [`${taxable.toLocaleString("ko-KR")}원 × ${nationalRate.value}% = ${rawNational.toLocaleString("ko-KR")}원`, reason, "징수 세액 10원 미만 버림"], taxBasis),
    local: traced("지방소득세", local, [`원천징수 소득세 ${national.toLocaleString("ko-KR")}원 × ${LOCAL_RATE.value}%`, "10원 미만 버림"], [LOCAL_RATE.basis, LOCAL_ROUNDING_BASIS]),
    total: traced("떼어 둘 세금 합계", national + local, [`소득세 ${national.toLocaleString("ko-KR")}원 + 지방소득세 ${local.toLocaleString("ko-KR")}원`], [...taxBasis, LOCAL_RATE.basis, LOCAL_ROUNDING_BASIS]),
    net: traced("실제 지급할 금액", gross - national - local, [`세전 지급액 ${gross.toLocaleString("ko-KR")}원 − 소득세 ${national.toLocaleString("ko-KR")}원 − 지방소득세 ${local.toLocaleString("ko-KR")}원`, "필요경비는 세금 계산에서만 차감하며 실제 지급액에서 빼지 않음"], [INPUT_BASIS, ...taxBasis, LOCAL_RATE.basis]),
    reason, underMinimum, smallWaived,
    deadline: { date: paymentDeadline(input.paidAt, input.paymentCycle), basis: [DEADLINE_BASIS, LOCAL_RATE.basis, ...(input.paymentCycle === "halfYearApproved" ? [HALF_YEAR_BASIS] : [])] },
  };
}
export type WithholdingResult = ReturnType<typeof computeWithholding>;
