import { applyBrackets } from "@/lib/tax/progressive";
import { floorWon } from "@/lib/tax/rounding";
import { traced, type Traced } from "@/lib/tax/trace";
import { formatWon } from "@/lib/won";
import { familyInputErrors, type FamilyPayrollInput } from "./input";
import { BASIC, DEPENDENT_SALARY_LIMIT, EXPENSE_BASIS, INCOME_BRACKETS, INPUT_BASIS, INSURANCE_BASES, LOCAL_BRACKETS, LOCAL_CREDIT, MODEL_BASIS, PAYROLL_BASIS, PENSION_BASIS, RELATED_BASIS, SALARY_BASIS, SALARY_DEDUCTION, SPECIAL_BASIS, STANDARD, WAGE_CREDIT } from "./rates";

export type FamilyPayrollResult = {
  salaryDeduction: Traced; wageIncome: Traced; wageBase: Traced; wageGrossTax: Traced;
  wageCredit: Traced; standardCredit: Traced; wageTax: Traced; wageLocalTax: Traced;
  insuranceCost: Traced; expense: Traced; lostDependentDeduction: Traced;
  baseAfter: Traced; businessTaxBefore: Traced; businessTaxAfter: Traced;
  businessTaxSaving: Traced | null; localTaxSaving: Traced | null; netSaving: Traced | null;
  deductionMethod: "standard" | "insurance"; reviewReasons: string[]; notes: string[];
};
export function computeFamilyPayroll(input: FamilyPayrollInput): FamilyPayrollResult {
  const errors = familyInputErrors(input);
  if (errors.length) throw new Error(errors.join(" "));
  const money = formatWon;
  const model = [INPUT_BASIS, MODEL_BASIS];
  const expense = traced("요건 확인을 전제로 한 필요경비", input.salary + input.employerPremium,
    [`총급여 ${money(input.salary)} + 사업주 부담 보험료 ${money(input.employerPremium)}`, "실제 근무·급여 적정성·지급 증빙과 보험료의 사업 관련성을 확인한 경우에만 적용"], [EXPENSE_BASIS, PAYROLL_BASIS, RELATED_BASIS, ...model]);
  const lostDependentDeduction = traced("사업주가 잃는 가족 기본공제", input.wasDependent && input.salary > DEPENDENT_SALARY_LIMIT.value ? BASIC.value : 0,
    [input.wasDependent ? "고용 전 해당 가족의 기본공제를 실제 적용했다고 입력" : "고용 전 해당 가족의 기본공제를 적용하지 않았다고 입력", "가족에게 이 급여 외 소득이 없다는 전제", `총급여 ${money(DEPENDENT_SALARY_LIMIT.value)} 초과 시 기존 기본공제 ${money(BASIC.value)}를 과세표준에 되더함`], [BASIC.basis, DEPENDENT_SALARY_LIMIT.basis, ...model]);
  const baseAfter = traced("고용 후 사업주 과세표준 가정", Math.max(0, input.businessTaxBase - expense.value + lostDependentDeduction.value),
    [`고용 전 ${money(input.businessTaxBase)} − 필요경비 ${money(expense.value)} + 부양공제 상실 ${money(lostDependentDeduction.value)}`, "음수 과세표준은 없음. 이월결손금의 미래 절세 효과는 미반영"], [EXPENSE_BASIS, PAYROLL_BASIS, BASIC.basis, ...model]);
  const businessTaxBefore = applyBrackets(input.businessTaxBase, INCOME_BRACKETS, "고용 전 사업주 소득세 산출세액", floorWon);
  const businessTaxAfter = applyBrackets(baseAfter.value, INCOME_BRACKETS, "고용 후 사업주 소득세 산출세액 가정", floorWon);
  if (!businessTaxBefore.steps.length) businessTaxBefore.steps.push("고용 전 과세표준이 없어 산출세액은 0원");
  if (!businessTaxAfter.steps.length) businessTaxAfter.steps.push("고용 후 과세표준이 없어 산출세액은 0원");
  const localBefore = applyBrackets(input.businessTaxBase, LOCAL_BRACKETS, "고용 전 지방소득세", floorWon);
  const localAfter = applyBrackets(baseAfter.value, LOCAL_BRACKETS, "고용 후 지방소득세", floorWon);
  const salaryDeduction = applyBrackets(input.salary, { value: SALARY_DEDUCTION.value.brackets, basis: SALARY_DEDUCTION.basis }, "직원 근로소득공제", floorWon);
  salaryDeduction.value = Math.min(salaryDeduction.value, SALARY_DEDUCTION.value.cap);
  salaryDeduction.steps.push(`근로소득공제 한도 ${money(SALARY_DEDUCTION.value.cap)}`);
  const wageIncome = traced("직원 근로소득금액", input.salary - salaryDeduction.value, [`총급여 ${money(input.salary)} − 근로소득공제 ${money(salaryDeduction.value)}`], [SALARY_BASIS, SALARY_DEDUCTION.basis, ...model]);
  const commonBase = Math.max(0, wageIncome.value - BASIC.value - input.workerPension);
  const c = WAGE_CREDIT.value;
  const limitRow = c.limits.find(row => row.salary === null || input.salary <= row.salary)!;
  const limit = floorWon(Math.max(limitRow.floor, limitRow.start - (input.salary - limitRow.from) * limitRow.reduce));
  function candidate(withInsurance: boolean) {
    const base = Math.max(0, commonBase - (withInsurance ? input.workerOtherPremium : 0));
    const gross = applyBrackets(base, INCOME_BRACKETS, "직원 소득세 산출세액", floorWon);
    if (!gross.steps.length) gross.steps.push("직원 과세표준이 없어 산출세액은 0원");
    const credit = Math.min(limit, floorWon(gross.value <= c.threshold ? gross.value * c.lowRate : c.base + (gross.value - c.threshold) * c.highRate));
    const standard = withInsurance ? 0 : Math.min(STANDARD.value, Math.max(0, gross.value - credit));
    return { base, gross, credit, standard, tax: Math.max(0, gross.value - credit - standard) };
  }
  const standard = candidate(false), insurance = candidate(true);
  const deductionMethod = standard.tax <= insurance.tax ? "standard" : "insurance";
  const chosen = deductionMethod === "standard" ? standard : insurance;
  const wageBase = traced("직원 과세표준", chosen.base, [
    `근로소득금액 ${money(wageIncome.value)} − 본인공제 ${money(BASIC.value)} − 국민연금 ${money(input.workerPension)}`,
    deductionMethod === "insurance" ? `건강·장기요양·고용보험료 ${money(input.workerOtherPremium)} 추가 소득공제, 표준세액공제 미적용` : "보험료 특별소득공제 대신 표준세액공제 적용", "음수는 없음",
  ], [BASIC.basis, PENSION_BASIS, SPECIAL_BASIS, STANDARD.basis, ...model]);
  const wageCredit = traced("직원 근로소득세액공제", chosen.credit,
    [`산출세액 ${money(chosen.gross.value)}에 소득세법 제59조의 구간별 공제 적용`, `총급여별 공제 한도 ${money(limit)} 이내`], [WAGE_CREDIT.basis, ...model]);
  const standardCredit = traced("직원 표준세액공제", chosen.standard, [deductionMethod === "standard" ? `법정 공제 ${money(STANDARD.value)}, 남은 세액 이내` : "보험료 특별소득공제를 선택해 표준세액공제는 적용하지 않음"], [STANDARD.basis, SPECIAL_BASIS, ...model]);
  const wageTax = traced("직원 연간 소득세 추정", chosen.tax,
    [`산출세액 ${money(chosen.gross.value)} − 근로소득세액공제 ${money(chosen.credit)} − 표준세액공제 ${money(chosen.standard)}`, `표준세액공제 방식 ${money(standard.tax)} / 보험료 특별소득공제 방식 ${money(insurance.tax)} 중 작은 세액`, "이 급여만 있는 직원의 연간 세액 추정. 월 원천징수액 아님"], [INCOME_BRACKETS.basis, WAGE_CREDIT.basis, STANDARD.basis, SPECIAL_BASIS, ...model]);
  const wageLocalTax = traced("직원 연간 지방소득세 추정", floorWon(wageTax.value * LOCAL_CREDIT.value),
    [`직원 소득세 결정세액 ${money(wageTax.value)} × 지방 표준세율 비율`, "국세 공제의 지방세 공제 반영. 원 미만 절사 진단 가정, 조례 가감 미반영"], [LOCAL_BRACKETS.basis, LOCAL_CREDIT.basis, ...model]);
  const insuranceCost = traced("가계 전체의 연간 보험 증가액", input.employerPremium + input.workerPension + input.workerOtherPremium,
    [`사업주 ${money(input.employerPremium)} + 직원 국민연금 ${money(input.workerPension)} + 직원 건강·장기요양·고용 ${money(input.workerOtherPremium)}`, "동거·관계로 보험료를 자동 제외하지 않음. 대표자 가입 전환 효과는 별도 Josh 감수 필요"], [...INSURANCE_BASES, ...model]);
  const reviewReasons: string[] = [];
  for (const [key, label] of [["actualWork", "실제 근무"], ["reasonablePay", "업무에 비례한 적정 급여"], ["evidence", "계약·근무 기록·급여 이체 증빙"]] as const) {
    if (input[key] !== "yes") reviewReasons.push(`${label} ${input[key] === "no" ? "미충족" : "미확인"}: 비용 인정과 근로소득 분류 Josh 감수 필요.`);
  }
  if (!input.insuranceConfirmed) reviewReasons.push("보험별 가입 여부·가족 근로자성·실제 부담 증가액 미확인: Josh 감수 필요.");
  if (!input.onlySalary) reviewReasons.push("가족 직원의 다른 소득 또는 고용 전 본인부담 보험료 유무 미확인: 전후 세금·보험 비교 Josh 감수 필요.");
  const businessTaxSaving = reviewReasons.length ? null : traced("사업주 소득세 감소 추정", businessTaxBefore.value - businessTaxAfter.value,
    [`고용 전 ${money(businessTaxBefore.value)} − 고용 후 ${money(businessTaxAfter.value)}`, "사업주 세액공제·감면 변동 전 산출세액 차이. 음수면 증가"], [INCOME_BRACKETS.basis, EXPENSE_BASIS, PAYROLL_BASIS, BASIC.basis, ...model]);
  const localTaxSaving = reviewReasons.length ? null : traced("사업주 지방소득세 감소 추정", localBefore.value - localAfter.value,
    [`고용 전 ${money(localBefore.value)} − 고용 후 ${money(localAfter.value)}`, "각 과세표준에 지방 표준세율 적용. 세액공제·조례 가감 미반영"], [LOCAL_BRACKETS.basis, ...model]);
  const netSaving = businessTaxSaving && localTaxSaving ? traced("가계 연간 순절약 추정", businessTaxSaving.value + localTaxSaving.value - insuranceCost.value - wageTax.value - wageLocalTax.value,
    [`사업주 소득세 감소 ${money(businessTaxSaving.value)} + 지방소득세 감소 ${money(localTaxSaving.value)}`, `− 가계 보험 증가 ${money(insuranceCost.value)} − 직원 소득세 ${money(wageTax.value)} − 직원 지방소득세 ${money(wageLocalTax.value)}`, "급여는 가계 안에서 옮기는 돈이므로 다시 차감하지 않음. 음수는 가계 부담 증가", "국민연금의 미래 급여·보험 보장 가치는 현금절약에 포함하지 않음"], [EXPENSE_BASIS, PAYROLL_BASIS, INCOME_BRACKETS.basis, LOCAL_BRACKETS.basis, LOCAL_CREDIT.basis, ...model]) : null;
  return { salaryDeduction, wageIncome, wageBase, wageGrossTax: chosen.gross, wageCredit, standardCredit, wageTax, wageLocalTax, insuranceCost, expense, lostDependentDeduction, baseAfter, businessTaxBefore, businessTaxAfter, businessTaxSaving, localTaxSaving, netSaving, deductionMethod, reviewReasons,
    notes: [
      "2026년 개인사업자의 장부 신고와, 고용 전 다른 소득·본인부담 보험료가 없고 고용 후에는 이 급여만 있는 배우자·자녀 한 명을 가정합니다. 법인·공동사업자 배분·추계신고·일용근로는 대상 밖입니다.",
      "실제 업무, 업무량에 비례한 급여, 계약서·근무기록·지급 증빙을 확인해야 합니다. 체크만으로 필요경비 인정이 확정되지 않습니다. 사업소득 경비 인정과 직원 근로소득 과세는 서로 다른 판단입니다.",
      "동거 가족이라는 사실만으로 보험 적용을 일괄 판정하지 않습니다. 공단에서 국민연금·건강·장기요양·고용·산재 각각의 근로자성·가입 예외·실제 증가액을 확인하세요. 산재는 사업주 부담액에 포함합니다.",
      "보험료는 고용 전후 차이를 입력합니다. 최초 직원 채용에 따른 대표자 직장가입 전환·지역보험 감소·피부양자 상실은 자동 계산하지 않습니다. 경비로 인정되지 않는 대표자 부담액이 섞이면 Josh 감수 필요.",
      "사업주 기존 가족 기본공제는 실제 적용하던 경우에만 상실을 반영합니다. 자녀 나이·장애 요건은 별도 확인. 자녀세액공제 및 교육·의료비 등 가족 관련 공제 변동은 미반영입니다.",
      "직원은 본인공제·국민연금공제·근로소득세액공제를 적용하고 보험료 특별소득공제와 표준세액공제 중 유리한 방식을 비교합니다. 다른 공제·감면·비과세 급여·다른 소득은 미반영입니다.",
      "사업주 세금은 세액공제·감면 변동 전 산출세액 차이이며 실제 납부액 절감과 다를 수 있습니다. 결손금 이월효과·퇴직급여·신고비용·가산세·보험 보장가치 및 미래 연금은 미반영입니다.",
      "각 단계 원 미만 절사는 진단 가정입니다. 신고 납부 끝수처리·지방세 조례 가감 미반영. 지방세 세액공제 특례는 2026년 귀속 한정입니다.",
      "공식 계산기 실측 미대조. 가족 근로자성·급여 적정성과 최종 절약액은 Josh 최종 감수 대기입니다.",
    ] };
}
