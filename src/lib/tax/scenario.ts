import { bookkeepingCost, type Assumptions } from "./assumptions";
import { computeCorpTax } from "./corp-tax";
import {
  CORP_SINCERE_SUCCESSION,
  SINCERE_CONFIRM_CAP_CORP,
  SINCERE_CONFIRM_CAP_INDIV,
  SINCERE_CONFIRM_CREDIT_RATE,
  STARTUP_RELIEF_CONVERSION,
} from "./rates";
import { sincereFilingStatus } from "./conversion/sincere-filing";
import {
  earnedIncomeAmount,
  earnedIncomeTaxCredit,
  selfBasicDeduction,
  standardTaxCredit,
  yellowUmbrellaDeduction,
} from "./deductions";
import { computeOwnerIncomeTax } from "./dividend";
import { employeeInsurance, extraIncomeInsurance, familyEmploymentInsurance, npsContribution, regionalHealthParts, regionalInsurance } from "./insurance";
import { estimateDeferredTax, retirementMultipleEffect, type RetirementMultipleEffect } from "./retirement-est";
import { floorTenWon, floorWon } from "./rounding";
import type { ScenarioInput } from "./scenario-input";
import type { Basis } from "./sources";
import { sumTraced, traced, type Traced } from "./trace";

export type ScenarioResult = {
  ownerDisposable: Traced;
  corpRetained: Traced;
  combinedNetWorth: Traced;
  totalBurden: Traced;
  deferredTaxEst: Traced;
  /** 가족 근무자 전원의 근로소득세·지방세·본인부담 보험 합계 (개인 시나리오·가족 0명이면 0) */
  familyBurden: Traced;
  /** 가족 근무자 전원의 실수령 합계. 기본 합산 순자산에는 넣지 않는다 (Josh 2026-09-26 확정) */
  familyDisposable: Traced;
  /** 합산 순자산 + 가족 실수령 — 화면 토글 「가족 실수령 포함해서 보기」용(기본 OFF). 개인 시나리오는 combinedNetWorth와 동일 */
  combinedNetWorthWithFamily: Traced;
  /** 정관 배수 3배 선택 시 「비용 인정 증가 / 초과분 근로소득세」. 그 외 undefined */
  retirementDetail?: RetirementMultipleEffect;
};

const won = (n: number) => n.toLocaleString("ko-KR");

const FAMILY_BASIS: Basis = {
  kind: "assumption",
  description:
    "가족 급여는 실제 근무 사실이 입증될 때만 법인 비용. 공제는 자동 5종 + 본인 기본공제만(1화 전제와 동일). 개인 시나리오에는 미반영. 가족 실수령은 합산 순자산에 넣지 않음(토글로 따로 봄, Josh 2026-09-26 확정)",
  editable: true,
};

/** 가족 근무자 별거 시 고용·산재보험 반영 (Josh 2026-09-26 R4) */
const EMPLOYMENT_RESIDENCE_BASIS: Basis = {
  kind: "assumption",
  description:
    "가족 근무자가 대표와 따로 살면 고용보험 적용 대상으로 보아 사업주 고용보험(실업급여 0.9% + 고용안정·직업능력개발 0.25%)과 산재보험료(기타의 각종사업 8.6/1000 대표값)를 법인 비용에 더한다. 동거 친족은 고용보험 미반영. 산재보험료율은 사업종류별로 다르므로 실제 요율은 공단 확인 필요",
  editable: true,
};

function profitOf(input: ScenarioInput): number {
  return input.accountingProfit + input.taxAdjustment;
}

const RELIEF_BASIS: Basis = {
  kind: "assumption",
  description: "창업감면은 산출세액 × 감면율 × (사업소득/종합소득) 비례 적용. 최저한세 미반영. 창업중소기업 감면은 농특세 비과세(농특세법 §4 3호). 지방소득세는 결정세액 × 10%(감면 반영, 지특법 §167의2①)",
  editable: true,
};

/** 이월결손금 공제는 모델에 넣지 않는다 (2026-09-26 최종 감사 B1) */
export const LOSS_CARRYFORWARD_NOTE = "적자는 다음 해로 넘겨 공제하지 않은 것으로 봅니다";

const LOSS_BASIS: Basis = {
  kind: "assumption",
  description: `법인 비용(급여·보험·가족 급여)이 이익보다 크면 법인 현금이 줄어든다. 법인세는 0. ${LOSS_CARRYFORWARD_NOTE}`,
  editable: true,
};

/** 성실신고확인비용(연) — 직접 입력이 없으면 대상자에 한해 전제값. 세액공제 = min(비용 × 60%, 한도) */
export function sincereConfirm(input: ScenarioInput, a: Assumptions, side: "indiv" | "corp"): { isTarget: boolean; cost: number; credit: number; net: number } {
  const { isTarget } = sincereFilingStatus(input.industryGroup, input.revenue);
  const applies = side === "indiv" ? isTarget : isTarget; // 법인: 개인이 대상이면 전환 후 3년 승계(§60의2①2호)
  const cost = !applies ? 0 : input.sincereFilingConfirmCost > 0 ? input.sincereFilingConfirmCost : a.sincereConfirmCost;
  const cap = side === "indiv" ? SINCERE_CONFIRM_CAP_INDIV.value : SINCERE_CONFIRM_CAP_CORP.value;
  const credit = cost > 0 ? Math.min(floorWon(cost * SINCERE_CONFIRM_CREDIT_RATE.value), cap) : 0;
  return { isTarget, cost, credit, net: cost - credit };
}

/** 창업중소기업 감면액 — 산출세액 × 감면율 × 사업소득 비중 (10원 미만 버림) */
export function startupRelief(calculatedTax: number, rate: number, businessIncome: number, totalIncome: number): number {
  if (rate <= 0 || calculatedTax <= 0 || businessIncome <= 0) return 0;
  const share = totalIncome > 0 ? Math.min(1, businessIncome / totalIncome) : 1;
  return floorTenWon(calculatedTax * rate * share);
}

/** 가족 근무자 1인의 법인 비용(급여+사용자 보험)과 본인 세부담·실수령. 별거면 고용·산재보험 추가(R4) */
export function familyWorkerCost(salary: number, separateResidence = false): {
  salary: number;
  employerInsurance: number;
  employeeInsurance: number;
  incomeTax: number;
  localTax: number;
  burden: number;
  disposable: number;
  corpCost: number;
  basis: Basis[];
} {
  const pay = Math.max(0, salary);
  const ins = employeeInsurance(pay);
  const emp = separateResidence ? familyEmploymentInsurance(pay) : null;
  const employeeInsuranceTotal = ins.employee.value + (emp?.employee.value ?? 0);
  const employerInsuranceTotal = ins.employer.value + (emp?.employer.value ?? 0);
  const earnedAmt = earnedIncomeAmount(pay).value;
  const deductions = selfBasicDeduction().value + ins.npsEmployee.value + ins.nhisEmployee.value + ins.ltcEmployee.value;
  const calc = computeOwnerIncomeTax({ nonFinancialIncome: earnedAmt, deductions, dividend: 0, taxCredits: 0 });
  const credit = earnedIncomeTaxCredit(calc.calculatedTax.value, pay).value + standardTaxCredit(true).value;
  const tax = computeOwnerIncomeTax({ nonFinancialIncome: earnedAmt, deductions, dividend: 0, taxCredits: credit });
  const burden = tax.determinedTax.value + tax.localTax.value + employeeInsuranceTotal;
  return {
    salary: pay,
    employerInsurance: employerInsuranceTotal,
    employeeInsurance: employeeInsuranceTotal,
    incomeTax: tax.determinedTax.value,
    localTax: tax.localTax.value,
    burden,
    disposable: pay - burden,
    corpCost: pay + employerInsuranceTotal,
    basis: [
      FAMILY_BASIS,
      ...(separateResidence ? [EMPLOYMENT_RESIDENCE_BASIS, ...(emp ? emp.employer.basis : [])] : []),
      ...tax.determinedTax.basis,
      ...ins.employee.basis,
    ],
  };
}

function familyTotals(input: ScenarioInput) {
  const n = Math.max(0, Math.min(2, Math.floor(input.familyWorkers)));
  if (n === 0) {
    return {
      n: 0,
      corpCost: 0,
      burden: traced("가족 세부담", 0, ["가족 근무자 없음"], []),
      disposable: traced("가족 실수령", 0, ["가족 근무자 없음"], []),
    };
  }
  const one = familyWorkerCost(input.familySalaryEach, input.familyLivesSeparately);
  const steps = [
    `1인: 급여 ${won(one.salary)} → 소득세 ${won(one.incomeTax)} + 지방 ${won(one.localTax)} + 본인 보험 ${won(one.employeeInsurance)} = ${won(one.burden)}`,
    `법인 비용 1인 ${won(one.corpCost)} (급여 + 사용자 보험 ${won(one.employerInsurance)}) × ${n}명`,
    ...(input.familyLivesSeparately ? ["대표와 따로 사는 가족 → 고용보험·산재보험 반영"] : ["대표와 동거하는 가족으로 봄 → 고용보험 미반영"]),
  ];
  return {
    n,
    corpCost: one.corpCost * n,
    burden: traced("가족 세부담", one.burden * n, steps, one.basis),
    disposable: traced("가족 실수령", one.disposable * n, [`1인 ${won(one.salary)} − ${won(one.burden)} = ${won(one.disposable)} × ${n}명`], one.basis),
  };
}

/** 배당 가능 현금(세후 법인이익 − 기장료). 배당액 입력과 무관 — 코덱 v1 마이그레이션에서도 사용 */
export function corpDistributableCash(input: ScenarioInput, a: Assumptions): number {
  const profit = profitOf(input);
  const salary = Math.max(0, input.ownerSalary);
  const ins = employeeInsurance(salary);
  const fam = familyTotals(input);
  const preTax = profit - salary - ins.employer.value - fam.corpCost;
  const corp = computeCorpTax(Math.max(0, preTax));
  const afterTax = preTax - corp.corpTax.value - corp.localTax.value;
  return afterTax - bookkeepingCost(a, "corp");
}

const REGIONAL_HEALTH_EXPENSE_BASIS: Basis = {
  kind: "law",
  law: "소득세법 시행령",
  article: "제55조 제1항 제11호의3",
  url: "https://www.law.go.kr/법령/소득세법시행령/제55조",
  effectiveFrom: "2026-07-01",
  appliesTo:
    "「국민건강보험법」·「노인장기요양보험법」에 따른 지역가입자로서 부담하는 건강보험료·장기요양보험료는 사업소득 필요경비. 국민연금(소득공제)과 달리 사업소득금액에서 뺀다 (Josh 2026-09-26 R2)",
  confirmedAt: "2026-09-26",
};

export function runIndividual(input: ScenarioInput, a: Assumptions): ScenarioResult {
  const profit = profitOf(input);
  const book = bookkeepingCost(a, "indiv", input.bookkeepingType);
  const ins = regionalInsurance(profit, input.personalContext.propertyForHealthIns);
  const nps = npsContribution(profit, "full").amount;
  // R2: 지역가입 건강·장기요양보험료는 필요경비 → 사업소득금액에서 차감 (영 §55①11의3)
  const health = regionalHealthParts(profit);
  const healthExpense = health.nhis + health.ltc;
  const businessIncome = Math.max(0, profit - healthExpense);
  const basic = selfBasicDeduction();
  const yellow = input.yellowUmbrellaEnabled ? yellowUmbrellaDeduction(businessIncome, input.yellowUmbrellaContribution) : null;
  const deductions = basic.value + nps + (yellow?.value ?? 0);
  const std = standardTaxCredit(false);
  const sincere = sincereConfirm(input, a, "indiv");
  const totalIncome = businessIncome + input.personalContext.otherIncome;
  const pre = computeOwnerIncomeTax({ nonFinancialIncome: totalIncome, deductions, dividend: 0, taxCredits: 0 });
  const relief = startupRelief(pre.calculatedTax.value, input.startupReliefRate, businessIncome, totalIncome);
  const tax = computeOwnerIncomeTax({
    nonFinancialIncome: totalIncome,
    deductions,
    dividend: 0,
    taxCredits: std.value + sincere.credit + relief,
  });
  const burden = tax.determinedTax.value + tax.localTax.value + ins.value + book + sincere.cost;
  const disposable = profit - burden;
  const zero = traced("법인 유보금", 0, ["개인 시나리오"], []);
  const healthStep = `지역 건강·장기요양보험료 필요경비 ${won(healthExpense)} (사업소득 ${won(profit)} → ${won(businessIncome)})`;
  const extraSteps = [
    healthStep,
    ...(yellow ? [`노란우산 소득공제 ${won(yellow.value)}`] : ["노란우산 미가입"]),
    ...(relief > 0 ? [`창업감면 ${(input.startupReliefRate * 100).toFixed(0)}% → 산출세액에서 ${won(relief)} 감면 (남은 ${input.startupReliefYearsLeft}년, 최저한세 미반영)`] : []),
    ...(sincere.cost > 0 ? [`성실신고확인비용 ${won(sincere.cost)} − 세액공제 ${won(sincere.credit)}`] : []),
  ];
  const extraBasis: Basis[] = [
    REGIONAL_HEALTH_EXPENSE_BASIS,
    ...(yellow ? yellow.basis : []),
    ...(relief > 0 ? [STARTUP_RELIEF_CONVERSION.basis, RELIEF_BASIS] : []),
  ];
  return {
    ownerDisposable: traced("대표자 가처분현금", disposable, [`이익 ${won(profit)} − 부담 ${won(burden)}`, ...extraSteps], [...tax.determinedTax.basis, ...ins.basis, ...extraBasis]),
    corpRetained: zero,
    combinedNetWorth: traced("합산 순자산 증가", disposable, ["개인 = 가처분"], []),
    totalBurden: traced("총 세금·보험·유지비용", burden, [
      `결정세 ${won(tax.determinedTax.value)}`,
      `지방 ${won(tax.localTax.value)}`,
      `보험 ${won(ins.value)}`,
      `기장 ${won(book)}`,
      ...extraSteps,
    ], [...tax.determinedTax.basis, ...ins.basis, ...extraBasis]),
    deferredTaxEst: traced("2차 과세 추정", 0, ["개인 유보 없음"], []),
    familyBurden: traced("가족 세부담", 0, ["개인 시나리오 — 가족 급여 미반영"], []),
    familyDisposable: traced("가족 실수령", 0, ["개인 시나리오 — 가족 급여 미반영"], []),
    combinedNetWorthWithFamily: traced("합산 순자산 증가 (가족 실수령 포함)", disposable, ["개인 = 가처분. 가족 급여 없음"], []),
  };
}

export function runCorporate(input: ScenarioInput, a: Assumptions): ScenarioResult {
  const profit = profitOf(input);
  const salary = Math.max(0, input.ownerSalary);
  const ins = employeeInsurance(salary);
  const book = bookkeepingCost(a, "corp");
  const fam = familyTotals(input);
  // 세금 계산용 과표만 0 이상으로 묶는다. 법인 현금·유보는 적자(음수)를 그대로 둔다
  const preTax = profit - salary - ins.employer.value - fam.corpCost;
  const corpBase = Math.max(0, preTax);
  const corp = computeCorpTax(corpBase);
  const afterTax = preTax - corp.corpTax.value - corp.localTax.value;
  const sincere = sincereConfirm(input, a, "corp");
  const cash = afterTax - book - sincere.cost + sincere.credit;
  const requested = Math.max(0, floorWon(input.dividendAmount));
  const dividend = Math.min(requested, Math.max(0, cash));
  const retained = cash - dividend;

  const earnedAmt = earnedIncomeAmount(salary).value;
  const npsDed = ins.npsEmployee.value;
  const healthDed = ins.nhisEmployee.value + ins.ltcEmployee.value;
  const deductions = selfBasicDeduction().value + npsDed + healthDed;
  const earnedCalc = computeOwnerIncomeTax({
    nonFinancialIncome: earnedAmt + input.personalContext.otherIncome,
    deductions,
    dividend: 0,
    taxCredits: 0,
  });
  const workCredit = earnedIncomeTaxCredit(earnedCalc.calculatedTax.value, salary);
  const std = standardTaxCredit(true);
  const tax = computeOwnerIncomeTax({
    nonFinancialIncome: earnedAmt + input.personalContext.otherIncome,
    deductions,
    dividend,
    taxCredits: workCredit.value + std.value,
  });

  const extraIns = extraIncomeInsurance(dividend);
  const ownerOut = tax.determinedTax.value + tax.localTax.value + ins.employee.value + extraIns.value;
  const disposable = salary + dividend - ownerOut;
  const corpBurden = corp.corpTax.value + corp.localTax.value + ins.employer.value + book + sincere.net;
  const totalBurden = ownerOut + corpBurden;
  const otherComprehensive = earnedAmt + input.personalContext.otherIncome;

  const retirementDetail =
    input.retirementPlan && input.retirementMultiple === 3
      ? retirementMultipleEffect({
          retained: Math.max(0, retained),
          salary,
          serviceYears: a.retirementServiceYears,
          multiple: 3,
          corpTaxBase: corpBase,
          otherComprehensive,
          deductions,
        })
      : undefined;

  return {
    ownerDisposable: traced("대표자 가처분현금", disposable, [
      `급여 ${won(salary)} + 배당 ${won(dividend)} − 개인 세금·보험 ${won(ownerOut)}`,
      `배당에 대한 보수 외 소득 건강보험료 ${won(extraIns.value)} (1천만 이하 0 / 초과 시 2천만 공제 후 부과)`,
      ...(requested > dividend ? [`입력 배당 ${won(requested)}은 배당 가능 현금 ${won(Math.max(0, cash))}까지로 자름`] : []),
    ], [...tax.determinedTax.basis, ...extraIns.basis]),
    corpRetained: traced("법인 유보금", retained, [
      `세후 ${won(afterTax)} − 기장 ${won(book)} − 배당 ${won(dividend)}`,
      ...(sincere.cost > 0 ? [`법인 성실신고 승계(전환 후 ${CORP_SINCERE_SUCCESSION.value.years}년): 확인비용 ${won(sincere.cost)} − 세액공제 ${won(sincere.credit)}`] : []),
      ...(fam.n > 0 ? [`가족 급여·사용자 보험 ${won(fam.corpCost)}은 법인 비용으로 차감됨`] : []),
      ...(preTax < 0 ? [`법인 적자 ${won(preTax)} — ${LOSS_CARRYFORWARD_NOTE}`] : []),
    ], preTax < 0 ? [...corp.corpTax.basis, LOSS_BASIS] : corp.corpTax.basis),
    combinedNetWorth: sumTraced("합산 순자산 증가", [
      traced("가처분", disposable, [], []),
      traced("유보", retained, [], []),
    ]),
    totalBurden: traced("총 세금·보험·유지비용", totalBurden, [
      `법인 세금 ${won(corp.corpTax.value + corp.localTax.value)}`,
      `사용자보험 ${won(ins.employer.value)}`,
      `기장 ${won(book)}`,
      `대표 세금·보험 ${won(ownerOut)} (배당 건보 ${won(extraIns.value)} 포함)`,
      ...(sincere.cost > 0 ? [`성실신고확인비용 순부담 ${won(sincere.net)}`] : []),
      ...(fam.n > 0 ? ["가족분 세금·보험은 「가족 세부담」 행에 별도 표시"] : []),
    ], [...corp.corpTax.basis, ...tax.determinedTax.basis, ...extraIns.basis, ...(sincere.cost > 0 ? [CORP_SINCERE_SUCCESSION.basis] : [])]),
    deferredTaxEst: estimateDeferredTax(Math.max(0, retained), otherComprehensive, deductions, {
      retirementPlan: input.retirementPlan,
      salary,
      serviceYears: a.retirementServiceYears,
      multiple: input.retirementMultiple,
      corpTaxBase: corpBase,
    }),
    familyBurden: fam.burden,
    familyDisposable: fam.disposable,
    combinedNetWorthWithFamily: traced(
      "합산 순자산 증가 (가족 실수령 포함)",
      disposable + retained + fam.disposable.value,
      [
        `가처분 ${won(disposable)} + 유보 ${won(retained)} + 가족 실수령 ${won(fam.disposable.value)}`,
        "가족 실수령 포함(사용자 선택)",
      ],
      fam.n > 0 ? [FAMILY_BASIS] : [],
    ),
    retirementDetail,
  };
}
