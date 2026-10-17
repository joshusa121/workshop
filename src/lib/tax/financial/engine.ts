import { applyBrackets } from "../progressive";
import { floorTenWon, floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import {
  DIVIDEND_GROSSUP,
  FINANCIAL_INCOME_THRESHOLD,
  FINANCIAL_THRESHOLD_BASIS,
  INCOME_TAX_BRACKETS,
  LOCAL_TAX_RATE,
  STOCK_BASIC_DEDUCTION,
  STOCK_RATE_BASIS,
  WITHHOLDING_RATE,
} from "./rates-fin";
import { normalizeFinancial, type FinancialInput } from "./input";

export type FinancialResult = {
  financialIncome: number;
  overThreshold: boolean;
  withholdingFed: Traced;
  withholdingLocal: number;
  calculatedTax: Traced;
  determinedTax: Traced;
  localTax: Traced;
  dividendCredit: Traced;
  dueFed: number;
  dueLocal: number;
  dueTotal: number;
  stock: {
    gain: Traced;
    taxBase: Traced;
    rateLabel: string;
    tax: Traced;
    localTax: Traced;
    total: number;
  };
  notes: string[];
};

export function computeFinancial(input: FinancialInput): FinancialResult {
  const i = normalizeFinancial(input);
  const notes: string[] = [];

  const financialIncome = i.interest + i.dividend;
  const threshold = FINANCIAL_INCOME_THRESHOLD.value;
  const wRate = WITHHOLDING_RATE.value;
  const overThreshold = financialIncome > threshold;

  // 원천징수 (14% 국세 + 1.4% 지방소득세) — 이미 뗀 세금
  const withholdingFedValue = floorTenWon(financialIncome * wRate);
  const withholdingLocalValue = floorTenWon(withholdingFedValue * LOCAL_TAX_RATE.value);
  const withholdingFed = traced(
    "기납부 원천징수세액(국세 14%)",
    withholdingFedValue,
    [`금융소득 ${financialIncome.toLocaleString("ko-KR")} × 14%`],
    [WITHHOLDING_RATE.basis],
  );

  // 종합소득 산출(§62 비교과세)
  const otherBase = floorWon(Math.max(0, i.otherIncome - i.deductions));
  const otherTax = otherBase > 0 ? applyBrackets(otherBase, INCOME_TAX_BRACKETS, "다른 종합소득 산출", floorTenWon).value : 0;
  const method2 = otherTax + withholdingFedValue;

  let method1 = method2;
  let grossUp = 0;
  let credit = 0;
  if (overThreshold) {
    const excess = financialIncome - threshold;
    grossUp = floorWon(Math.min(i.dividend, excess) * DIVIDEND_GROSSUP.value);
    const m1Base = floorWon(Math.max(0, i.otherIncome + excess + grossUp - i.deductions));
    method1 = (m1Base > 0 ? applyBrackets(m1Base, INCOME_TAX_BRACKETS, "방식1 누진", floorTenWon).value : 0) + floorTenWon(threshold * wRate);
    credit = Math.min(grossUp, Math.max(0, method1 - method2));
  }
  const calculated = floorTenWon(Math.max(method1, method2) - credit);
  const determined = floorTenWon(Math.max(0, calculated - i.taxCredits));
  const localValue = floorTenWon(determined * LOCAL_TAX_RATE.value);

  const calculatedTax = traced(
    "종합소득 산출세액",
    calculated,
    [
      overThreshold
        ? `금융소득 ${financialIncome.toLocaleString("ko-KR")} > 2천만원 → 방식1 ${method1.toLocaleString("ko-KR")} / 방식2 ${method2.toLocaleString("ko-KR")} 중 큰 금액`
        : `금융소득 ${financialIncome.toLocaleString("ko-KR")} ≤ 2천만원 → 분리과세(원천징수 종결)`,
      overThreshold ? `그로스업 ${grossUp.toLocaleString("ko-KR")} / 배당세액공제 ${credit.toLocaleString("ko-KR")}` : "",
    ].filter(Boolean),
    [FINANCIAL_THRESHOLD_BASIS, WITHHOLDING_RATE.basis, DIVIDEND_GROSSUP.basis],
  );
  const determinedTax = traced("종합소득 결정세액", determined, [`산출 ${calculated.toLocaleString("ko-KR")} − 세액공제 ${i.taxCredits.toLocaleString("ko-KR")}`], []);
  const localTax = traced("개인지방소득세", localValue, [`결정세액 ${determined.toLocaleString("ko-KR")} × 10%`], [LOCAL_TAX_RATE.basis]);
  const dividendCredit = traced("배당세액공제", credit, [overThreshold ? `한도 = 방식1 − 방식2` : "기준 이하 — 해당 없음"], [DIVIDEND_GROSSUP.basis]);

  const dueFed = determined - withholdingFedValue;
  const dueLocal = localValue - withholdingLocalValue;
  const dueTotal = dueFed + dueLocal;

  // 주식 양도세
  const gainValue = floorWon(i.stockGain);
  const gain = traced("주식 양도차익", gainValue, [`양도가 − 취득가 − 필요경비`], []);
  const stockBaseValue = Math.max(0, gainValue - STOCK_BASIC_DEDUCTION.value);
  const stockBase = traced("양도소득 과세표준", stockBaseValue, [`양도차익 ${gainValue.toLocaleString("ko-KR")} − 기본공제 250만원`], [STOCK_BASIC_DEDUCTION.basis]);
  const { tax: stockTaxValue, rateLabel } = stockTax(i.holder, i.smallCap, i.heldUnder1y, stockBaseValue);
  const tax = traced("양도소득세", stockTaxValue, [`${rateLabel}, 과표 ${stockBaseValue.toLocaleString("ko-KR")}`], [STOCK_RATE_BASIS]);
  const stockLocal = floorTenWon(stockTaxValue * LOCAL_TAX_RATE.value);
  const localStockTax = traced("개인지방소득세", stockLocal, [`양도소득세 ${stockTaxValue.toLocaleString("ko-KR")} × 10%`], [LOCAL_TAX_RATE.basis]);

  if (!overThreshold) notes.push("이자·배당 합계가 2천만원 이하라 분리과세로 종결됩니다(다른 종합소득과 합산하지 않음).");
  else notes.push("금융소득이 2천만원을 넘어 다른 종합소득과 합산(종합과세)되며, 비교과세(§62)로 유리한 방식을 택합니다.");
  notes.push(
    "대주주 판정은 주식 비율·시가총액 기준(소득세법 시행령 §157)에 따라 직접 선택하셔야 합니다.",
    "해외주식, 금융투자소득세(폐지), ISA·연금계좌, 배당소득 2천만원 이하의 원천징수분 등은 반영하지 않았습니다.",
  );

  return {
    financialIncome,
    overThreshold,
    withholdingFed,
    withholdingLocal: withholdingLocalValue,
    calculatedTax,
    determinedTax,
    localTax,
    dividendCredit,
    dueFed,
    dueLocal,
    dueTotal,
    stock: { gain, taxBase: stockBase, rateLabel, tax, localTax: localStockTax, total: stockTaxValue + stockLocal },
    notes,
  };
}

function stockTax(holder: "major" | "minor", smallCap: boolean, heldUnder1y: boolean, base: number): { tax: number; rateLabel: string } {
  if (base <= 0) return { tax: 0, rateLabel: "과세표준 없음" };
  if (holder === "major") {
    if (heldUnder1y && !smallCap) {
      return { tax: floorWon(base * 0.3), rateLabel: "대주주·1년 미만·중소기업 외 30%" };
    }
    const tax = applyBrackets(base, { value: [{ upTo: 300_000_000, rate: 0.2 }, { upTo: null, rate: 0.25 }], basis: STOCK_RATE_BASIS }, "주식 양도", floorWon).value;
    return { tax, rateLabel: "대주주 3억 이하 20% / 초과 25%" };
  }
  if (smallCap) return { tax: floorWon(base * 0.1), rateLabel: "비대주주·중소기업 10%" };
  return { tax: floorWon(base * 0.2), rateLabel: "비대주주 20%" };
}
