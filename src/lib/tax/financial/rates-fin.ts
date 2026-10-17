import type { RateEntry } from "../rates";
import type { Basis } from "../sources";

const CONFIRMED = "2026-10-16";
const ITA = (조: string) => `https://www.law.go.kr/법령/소득세법/${조}`;

export { FINANCIAL_INCOME_THRESHOLD, WITHHOLDING_RATE, DIVIDEND_GROSSUP, LOCAL_TAX_RATE, INCOME_TAX_BRACKETS } from "../rates";

/** 양도소득 기본공제 250만원 (소득세법 §103①) */
export const STOCK_BASIC_DEDUCTION: RateEntry<number> = {
  value: 2_500_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제103조 제1항",
    url: ITA("제103조"),
    effectiveFrom: "2026-01-01",
    appliesTo: "양도소득 기본공제 연 250만원",
    confirmedAt: CONFIRMED,
  },
};

export const STOCK_RATE_BASIS: Basis = {
  kind: "law",
  law: "소득세법",
  article: "제104조 제1항 제11호",
  url: ITA("제104조"),
  effectiveFrom: "2024-12-31",
  appliesTo:
    "대주주: 3억 이하 20% / 초과 25%(1년 미만·중소기업 외 30%). 비대주주: 중소기업 10% / 그 외 20%",
  confirmedAt: CONFIRMED,
};

export const FINANCIAL_THRESHOLD_BASIS: Basis = {
  kind: "law",
  law: "소득세법",
  article: "제14조 제3항 제6호",
  url: ITA("제14조"),
  effectiveFrom: "2026-01-01",
  appliesTo: "이자·배당 합계 2천만원 초과 시 종합과세(기준금액)",
  confirmedAt: CONFIRMED,
};

export type StockHolder = "major" | "minor";
