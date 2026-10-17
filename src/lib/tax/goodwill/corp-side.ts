import { computeCorpTax } from "../corp-tax";
import { CORP_TAX_BRACKETS, LOCAL_TAX_RATE } from "../rates";
import { floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import { CORP_SAVING_DISCOUNT_ASSUMPTION, CORP_TAX_BASE_ASSUMPTION, GOODWILL_AMORTIZATION } from "./facts";

export type CorpGoodwillSaving = {
  annualAmortization: Traced;
  /** 연 절세액 = 법인세+지방세(상각 전) − (상각 후) */
  annualSaving: Traced;
  fiveYearNominal: Traced;
  fiveYearPresent: Traced;
  years: number;
};

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");

function corpTotal(base: number): number {
  const r = computeCorpTax(base);
  return r.corpTax.value + r.localTax.value;
}

export function corpAmortizationSaving(goodwill: number, corpTaxBase: number, discountRate = 0): CorpGoodwillSaving {
  const { years, method } = GOODWILL_AMORTIZATION.value;
  const price = Math.max(0, goodwill);
  const amort = floorWon(price / years);
  const annualAmortization = traced(
    `연 감가상각비 (${method} ${years}년)`,
    amort,
    [`${won(price)} ÷ ${years}년 = ${won(price / years)}, 원 미만 버림`, "사업연도 초 취득 가정(첫해 월할 미반영)"],
    [GOODWILL_AMORTIZATION.basis],
  );

  const before = corpTotal(corpTaxBase);
  const after = corpTotal(corpTaxBase - amort);
  const saving = before - after;
  const annualSaving = traced(
    "연 절세액 (법인세 + 법인지방소득세)",
    saving,
    [
      `상각 전 과세표준 ${won(corpTaxBase)} → 세액 ${won(before)}`,
      `상각 후 과세표준 ${won(corpTaxBase - amort)} → 세액 ${won(after)}`,
      `차액 ${won(saving)}${corpTaxBase - amort < 0 ? " (과세표준이 음수가 되는 부분은 절세 효과 없음 — 이월결손금 미반영)" : ""}`,
    ],
    [CORP_TAX_BRACKETS.basis, LOCAL_TAX_RATE.basis, CORP_TAX_BASE_ASSUMPTION],
  );

  const fiveYearNominal = traced(
    `${years}년 절세 합계 (명목)`,
    saving * years,
    [`${won(saving)} × ${years}년 = ${won(saving * years)}`],
    [CORP_TAX_BASE_ASSUMPTION],
  );

  let pv = 0;
  const pvSteps: string[] = [];
  for (let n = 1; n <= years; n++) {
    const v = saving / (1 + discountRate) ** n;
    pv += v;
    pvSteps.push(`${n}년차 ${won(saving)} ÷ (1+${(discountRate * 100).toFixed(1)}%)^${n} = ${won(v)}`);
  }
  const fiveYearPresent = traced(
    `${years}년 절세 합계 (현가, 할인율 ${(discountRate * 100).toFixed(1)}%)`,
    Math.round(pv),
    pvSteps,
    [CORP_SAVING_DISCOUNT_ASSUMPTION],
  );

  return { annualAmortization, annualSaving, fiveYearNominal, fiveYearPresent, years };
}
