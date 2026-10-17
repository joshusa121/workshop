import type { StockHolder } from "./rates-fin";

export type FinancialInput = {
  /** 이자소득 (연) */
  interest: number;
  /** 배당소득 (연, 국내) */
  dividend: number;
  /** 금융소득 외 종합소득금액 (근로·사업 등) */
  otherIncome: number;
  /** 종합소득공제 (간편: 본인 기본공제 등) */
  deductions: number;
  /** 세액공제 (표준세액공제 등) */
  taxCredits: number;
  /** 주식 양도차익 (양도가 − 취득가 − 필요경비) */
  stockGain: number;
  /** 대주주 여부 */
  holder: StockHolder;
  /** 중소기업 주식 여부 */
  smallCap: boolean;
  /** 1년 미만 보유(대주주·중소기업 외) */
  heldUnder1y: boolean;
};

export const DEFAULT_FINANCIAL: FinancialInput = {
  interest: 8_000_000,
  dividend: 18_000_000,
  otherIncome: 0,
  deductions: 0,
  taxCredits: 0,
  stockGain: 0,
  holder: "major",
  smallCap: false,
  heldUnder1y: false,
};

export function normalizeFinancial(input: Partial<FinancialInput>): FinancialInput {
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const m = { ...DEFAULT_FINANCIAL, ...input };
  return {
    interest: num(m.interest),
    dividend: num(m.dividend),
    otherIncome: num(m.otherIncome),
    deductions: num(m.deductions),
    taxCredits: num(m.taxCredits),
    stockGain: num(m.stockGain),
    holder: m.holder === "minor" ? "minor" : "major",
    smallCap: Boolean(m.smallCap),
    heldUnder1y: Boolean(m.heldUnder1y),
  };
}
