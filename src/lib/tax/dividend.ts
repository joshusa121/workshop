import { applyBrackets } from "./progressive";
import {
  DIVIDEND_GROSSUP,
  FINANCIAL_INCOME_THRESHOLD,
  INCOME_TAX_BRACKETS,
  LOCAL_TAX_RATE,
  WITHHOLDING_RATE,
} from "./rates";
import { floorTenWon, floorWon } from "./rounding";
import { LOCAL_TAX_DETERMINED_BASIS, type Basis } from "./sources";
import { traced, type Traced } from "./trace";

const COMPARISON_BASIS: Basis = {
  kind: "law",
  law: "소득세법",
  article: "제62조",
  url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001565&lsJoLnkSeq=1000819717&print=print",
  effectiveFrom: "2018-12-31",
  appliesTo: "2026년 귀속 금융소득 비교과세",
  confirmedAt: "2026-09-02",
};

export function computeOwnerIncomeTax(opts: {
  nonFinancialIncome: number;
  deductions: number;
  dividend: number;
  taxCredits: number;
}): {
  calculatedTax: Traced;
  determinedTax: Traced;
  localTax: Traced;
  dividendCredit: Traced;
} {
  const other = Math.max(0, opts.nonFinancialIncome);
  const ded = Math.max(0, opts.deductions);
  const dividend = Math.max(0, opts.dividend);
  const threshold = FINANCIAL_INCOME_THRESHOLD.value;
  const wRate = WITHHOLDING_RATE.value;

  const otherBase = floorWon(Math.max(0, other - ded));
  const otherTax = applyBrackets(otherBase, INCOME_TAX_BRACKETS, "다른 종합소득 산출", floorTenWon).value;
  const withholding = floorTenWon(dividend * wRate);
  const method2 = otherTax + withholding;

  let method1 = method2;
  let grossUp = 0;
  if (dividend > threshold) {
    const excess = dividend - threshold;
    grossUp = floorWon(excess * DIVIDEND_GROSSUP.value);
    const m1Base = floorWon(Math.max(0, other + excess + grossUp - ded));
    const m1Progressive = applyBrackets(m1Base, INCOME_TAX_BRACKETS, "방식1 누진", floorTenWon).value;
    method1 = m1Progressive + floorTenWon(threshold * wRate);
  }

  const top = Math.max(method1, method2);
  const creditCap = Math.max(0, method1 - method2);
  const credit = dividend > threshold ? Math.min(grossUp, creditCap) : 0;
  const calculated = floorTenWon(top - credit);
  const determined = floorTenWon(Math.max(0, calculated - Math.max(0, opts.taxCredits)));
  const local = floorTenWon(determined * LOCAL_TAX_RATE.value);

  const steps = [
    `금융소득 ${dividend.toLocaleString("ko-KR")} / 기준 ${threshold.toLocaleString("ko-KR")}`,
    dividend <= threshold
      ? `기준 이하 — 제2호 ${method2.toLocaleString("ko-KR")}`
      : `방식1 ${method1.toLocaleString("ko-KR")} / 방식2 ${method2.toLocaleString("ko-KR")} / 그로스업 ${grossUp.toLocaleString("ko-KR")} / 공제 ${credit.toLocaleString("ko-KR")}`,
  ];

  return {
    calculatedTax: traced("종합소득 산출세액", calculated, steps, [COMPARISON_BASIS, DIVIDEND_GROSSUP.basis, FINANCIAL_INCOME_THRESHOLD.basis]),
    determinedTax: traced("종합소득 결정세액", determined, [`산출 ${calculated.toLocaleString("ko-KR")} − 세액공제 ${opts.taxCredits.toLocaleString("ko-KR")}`], [COMPARISON_BASIS]),
    localTax: traced(
      "개인지방소득세 (결정세액 × 10%)",
      local,
      [`산출 ${calculated.toLocaleString("ko-KR")} − 세액공제 ${opts.taxCredits.toLocaleString("ko-KR")} = 결정세액 ${determined.toLocaleString("ko-KR")} × 10%`],
      [LOCAL_TAX_RATE.basis, LOCAL_TAX_DETERMINED_BASIS],
    ),
    dividendCredit: traced("배당세액공제", credit, [`한도 = 방식1 − 방식2`], [COMPARISON_BASIS, DIVIDEND_GROSSUP.basis]),
  };
}
