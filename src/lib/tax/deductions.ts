import {
  BASIC_DEDUCTION_SELF,
  EARNED_INCOME_DEDUCTION,
  EARNED_INCOME_TAX_CREDIT,
  STANDARD_TAX_CREDIT_BIZ,
  STANDARD_TAX_CREDIT_WORKER,
  YELLOW_UMBRELLA_CAPS,
  YELLOW_UMBRELLA_CONTRIBUTION_MAX,
} from "./rates";
import { applyBrackets } from "./progressive";
import { floorWon } from "./rounding";
import { traced, type Traced } from "./trace";

/** 근로소득공제. 총급여 → 공제액 (한도 2천만원, 총급여 미달 시 총급여) */
export function earnedIncomeDeduction(grossSalary: number): Traced {
  const salary = Math.max(0, grossSalary);
  const raw = applyBrackets(salary, { ...EARNED_INCOME_DEDUCTION, value: EARNED_INCOME_DEDUCTION.value.brackets }, "근로소득공제", (n) => n);
  const capped = Math.min(raw.value, EARNED_INCOME_DEDUCTION.value.cap, salary);
  return traced(
    "근로소득공제",
    floorWon(capped),
    [...raw.steps, `한도 ${EARNED_INCOME_DEDUCTION.value.cap.toLocaleString("ko-KR")}원, 총급여 미달 시 총급여`],
    [EARNED_INCOME_DEDUCTION.basis],
  );
}

export function earnedIncomeAmount(grossSalary: number): Traced {
  const ded = earnedIncomeDeduction(grossSalary);
  const amount = Math.max(0, grossSalary - ded.value);
  return traced(
    "근로소득금액",
    amount,
    [`총급여 ${grossSalary.toLocaleString("ko-KR")} − 근로소득공제 ${ded.value.toLocaleString("ko-KR")}`],
    ded.basis,
  );
}

/** 근로소득세액공제. 근로소득에 대한 산출세액 + 총급여 */
export function earnedIncomeTaxCredit(earnedCalcTax: number, grossSalary: number): Traced {
  const { calc, limits } = EARNED_INCOME_TAX_CREDIT.value;
  let credit =
    earnedCalcTax <= calc.upTo
      ? earnedCalcTax * calc.rate
      : calc.excessBase + (earnedCalcTax - calc.upTo) * calc.excessRate;
  const limitRow = limits.find((l) => l.salaryUpTo === null || grossSalary <= l.salaryUpTo) ?? limits[limits.length - 1];
  const reduced = limitRow.start - Math.max(0, grossSalary - limitRow.reduceFrom) * limitRow.reduceRate;
  const cap = Math.max(limitRow.floor, reduced);
  credit = Math.min(credit, cap, earnedCalcTax);
  return traced(
    "근로소득세액공제",
    floorWon(credit),
    [
      `산출세액 ${earnedCalcTax.toLocaleString("ko-KR")} 기준 공제 후 한도 ${cap.toLocaleString("ko-KR")}`,
    ],
    [EARNED_INCOME_TAX_CREDIT.basis],
  );
}

export function standardTaxCredit(hasEarnedIncome: boolean): Traced {
  const entry = hasEarnedIncome ? STANDARD_TAX_CREDIT_WORKER : STANDARD_TAX_CREDIT_BIZ;
  return traced(
    hasEarnedIncome ? "표준세액공제 (근로)" : "표준세액공제 (사업)",
    entry.value,
    [`${entry.value.toLocaleString("ko-KR")}원. 특별공제 미신청 전제`],
    [entry.basis],
  );
}

export function selfBasicDeduction(): Traced {
  return traced(
    "기본공제 (본인)",
    BASIC_DEDUCTION_SELF.value,
    ["본인 1명 × 150만원. 배우자·부양가족 미반영"],
    [BASIC_DEDUCTION_SELF.basis],
  );
}

/** 노란우산공제 한도 — 사업소득금액 구간 (조특법 §86의3①) */
export function yellowUmbrellaCap(businessIncome: number): number {
  const row = YELLOW_UMBRELLA_CAPS.value.find((b) => b.upTo === null || businessIncome <= b.upTo)!;
  return row.cap;
}

/**
 * 노란우산공제 소득공제. contribution 미입력(undefined)이면 구간 한도 가득 납입으로 본다.
 * 공제 = min(납입액(연 1,800만 클램프), 구간 한도). 부동산임대업 비율 축소는 미반영.
 */
export function yellowUmbrellaDeduction(businessIncome: number, contribution?: number): Traced {
  const cap = yellowUmbrellaCap(Math.max(0, businessIncome));
  const paid = contribution === undefined ? cap : Math.min(Math.max(0, contribution), YELLOW_UMBRELLA_CONTRIBUTION_MAX.value);
  const value = Math.min(paid, cap);
  return traced(
    "노란우산공제 소득공제",
    floorWon(value),
    [
      `사업소득금액 ${businessIncome.toLocaleString("ko-KR")} → 구간 한도 ${cap.toLocaleString("ko-KR")}`,
      contribution === undefined ? `납입액 미입력 → 한도 가득 ${cap.toLocaleString("ko-KR")} 납입 가정` : `납입액 ${paid.toLocaleString("ko-KR")} (연 1,800만 이내)`,
      `공제 = min(납입, 한도) = ${value.toLocaleString("ko-KR")}. 부동산임대업 비율 축소 미반영`,
    ],
    [YELLOW_UMBRELLA_CAPS.basis, YELLOW_UMBRELLA_CONTRIBUTION_MAX.basis],
  );
}
