import { computeIncomeTax } from "../income-tax";
import { BASIC_DEDUCTION_SELF, LOCAL_TAX_RATE } from "../rates";
import { floorTenWon, floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import {
  BASIC_DEDUCTION_ONLY,
  GOODWILL_OTHER_INCOME_CLASS,
  OTHER_INCOME_EXPENSE_RATE,
  OTHER_INCOME_SEPARATE_LIMIT,
  OTHER_INCOME_WITHHOLDING_RATE,
  PRICE_EQUALS_VALUATION,
} from "./facts";

export type PersonalGoodwillTax = {
  /** 양도대가(= 평가액) */
  grossReceipt: Traced;
  necessaryExpense: Traced;
  otherIncomeAmount: Traced;
  /** 원천징수 합계(소득세 20% + 지방소득세) — 선납 */
  withholding: Traced;
  /** 종합과세 합산 시 추가 세부담(지방 포함, 합산 전·후 차액) */
  comprehensiveExtra: Traced;
  /** 최종 개인 세부담 */
  personalTax: Traced;
  /** 최종 세부담 − 원천징수. 양수면 추가 납부, 음수면 환급 */
  settlement: number;
  /** 기타소득금액 300만원 이하 → 분리과세 선택 가능 */
  separateTaxEligible: boolean;
};

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");

function totalIncomeTax(business: number, other: number, deductions: number): number {
  const r = computeIncomeTax(business, other, deductions);
  return r.incomeTax.value + r.localTax.value;
}

export function personalTaxOnGoodwill(goodwill: number, otherComprehensiveIncome: number): PersonalGoodwillTax {
  const price = Math.max(0, goodwill);
  const grossReceipt = traced(
    "영업권 양도대가 (기타소득 수입금액)",
    price,
    ["양도대가 = 상증법 평가액으로 본다"],
    [GOODWILL_OTHER_INCOME_CLASS, PRICE_EQUALS_VALUATION],
  );

  const expenseRate = OTHER_INCOME_EXPENSE_RATE.value;
  const expense = price * expenseRate;
  const necessaryExpense = traced(
    "필요경비 (수입금액 × 60%)",
    expense,
    [`${won(price)} × ${expenseRate * 100}% = ${won(expense)}`],
    [OTHER_INCOME_EXPENSE_RATE.basis],
  );

  const amount = floorWon(price - expense);
  const otherIncomeAmount = traced(
    "기타소득금액 (수입금액 − 필요경비)",
    amount,
    [`${won(price)} − ${won(expense)} = ${won(price - expense)}, 원 미만 버림`],
    [OTHER_INCOME_EXPENSE_RATE.basis],
  );

  const whRate = OTHER_INCOME_WITHHOLDING_RATE.value;
  const whNational = floorTenWon(amount * whRate);
  const whLocal = floorTenWon(whNational * LOCAL_TAX_RATE.value);
  const withholding = traced(
    "원천징수세액 (기타소득금액 × 20% + 지방소득세 10%)",
    whNational + whLocal,
    [
      `소득세 ${won(amount)} × ${whRate * 100}% = ${won(whNational)} (10원 미만 버림)`,
      `지방소득세 ${won(whNational)} × 10% = ${won(whLocal)}`,
      "법인이 대가 지급 시 떼고 납부. 종합소득세 신고 때 기납부세액으로 차감",
    ],
    [OTHER_INCOME_WITHHOLDING_RATE.basis, LOCAL_TAX_RATE.basis],
  );

  const ded = BASIC_DEDUCTION_SELF.value;
  const withTax = totalIncomeTax(otherComprehensiveIncome, amount, ded);
  const withoutTax = totalIncomeTax(otherComprehensiveIncome, 0, ded);
  const extra = withTax - withoutTax;
  const comprehensiveExtra = traced(
    "종합과세 합산 시 추가 세부담 (지방소득세 포함)",
    extra,
    [
      `다른 종합소득 ${won(otherComprehensiveIncome)} + 기타소득금액 ${won(amount)} − 기본공제 ${won(ded)} → 세액 ${won(withTax)}`,
      `다른 종합소득만 (${won(otherComprehensiveIncome)} − ${won(ded)}) → 세액 ${won(withoutTax)}`,
      `차액 ${won(withTax)} − ${won(withoutTax)} = ${won(extra)}`,
    ],
    [BASIC_DEDUCTION_ONLY, BASIC_DEDUCTION_SELF.basis],
  );

  const separateTaxEligible = amount > 0 && amount <= OTHER_INCOME_SEPARATE_LIMIT.value;
  const finalTax = separateTaxEligible ? Math.min(extra, withholding.value) : extra;
  const personalTax = traced(
    "개인 세부담 (영업권 양도로 늘어나는 세금)",
    finalTax,
    separateTaxEligible
      ? [
          `기타소득금액 ${won(amount)} ≤ 300만원 → 분리과세(원천징수로 종결 ${won(withholding.value)})와 종합과세(${won(extra)}) 중 작은 쪽`,
        ]
      : [`기타소득금액 ${won(amount)} > 300만원 → 종합과세 합산 필수. 추가 세부담 ${won(extra)}`],
    separateTaxEligible ? [OTHER_INCOME_SEPARATE_LIMIT.basis] : [OTHER_INCOME_SEPARATE_LIMIT.basis],
  );

  return {
    grossReceipt,
    necessaryExpense,
    otherIncomeAmount,
    withholding,
    comprehensiveExtra,
    personalTax,
    settlement: finalTax - withholding.value,
    separateTaxEligible,
  };
}
