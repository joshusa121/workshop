import type { RateEntry } from "../rates";
import type { Basis } from "../sources";

const CONFIRMED = "2026-10-16";
const VAT_LAW = (조: string) => `https://www.law.go.kr/법령/부가가치세법/${조}`;
const VAT_DEC = (조: string) => `https://www.law.go.kr/법령/부가가치세법시행령/${조}`;

export type VatIndustry = "retail" | "manufacturing" | "lodging" | "construction" | "professional" | "other";

export const VAT_RATE: RateEntry<number> = {
  value: 0.1,
  basis: {
    kind: "law",
    law: "부가가치세법",
    article: "제30조",
    url: VAT_LAW("제30조"),
    effectiveFrom: "2013-07-01",
    appliesTo: "부가가치세 세율 10%",
    confirmedAt: CONFIRMED,
  },
};

/** 업종별 부가가치율 (시행령 §111②) */
export const SIMPLE_VALUE_RATE: RateEntry<Record<VatIndustry, number>> = {
  value: {
    retail: 0.15,
    manufacturing: 0.2,
    lodging: 0.25,
    construction: 0.3,
    professional: 0.4,
    other: 0.3,
  },
  basis: {
    kind: "law",
    law: "부가가치세법 시행령",
    article: "제111조 제2항",
    url: VAT_DEC("제111조"),
    effectiveFrom: "2021-02-17",
    appliesTo: "소매·음식점 15%, 제조·농림어업 20%, 숙박 25%, 건설·운수창고·정보통신 30%, 전문·부동산 등 40%, 그 밖의 서비스 30%",
    confirmedAt: CONFIRMED,
  },
};

/** 간이과세자 세금계산서 매입 세액공제율 (법 §63③1호) */
export const SIMPLE_INPUT_CREDIT_RATE: RateEntry<number> = {
  value: 0.005,
  basis: {
    kind: "law",
    law: "부가가치세법",
    article: "제63조 제3항 제1호",
    url: VAT_LAW("제63조"),
    effectiveFrom: "2020-12-22",
    appliesTo: "세금계산서등을 발급받은 재화·용역 공급대가 × 0.5%를 납부세액에서 공제",
    confirmedAt: CONFIRMED,
  },
};

/** 간이과세 적용 한도 — 직전 연도 공급대가 1억 400만원 미만 (법 §61①, 영 §109①) */
export const SIMPLE_APPLY_THRESHOLD: RateEntry<number> = {
  value: 104_000_000,
  basis: {
    kind: "law",
    law: "부가가치세법 시행령",
    article: "제109조 제1항",
    url: VAT_DEC("제109조"),
    effectiveFrom: "2024-02-29",
    appliesTo: "직전 연도 공급대가 1억 400만원 미만이면 간이과세 적용(배제 업종 제외)",
    confirmedAt: CONFIRMED,
  },
};

/** 간이과세 납부의무 면제 — 공급대가 4,800만원 미만 (법 §69①) */
export const SIMPLE_EXEMPT_THRESHOLD: RateEntry<number> = {
  value: 48_000_000,
  basis: {
    kind: "law",
    law: "부가가치세법",
    article: "제69조 제1항",
    url: VAT_LAW("제69조"),
    effectiveFrom: "2020-12-22",
    appliesTo: "공급대가 합계액 4,800만원 미만이면 §63② 납부의무 면제(재고품 매입세액 가산은 예외)",
    confirmedAt: CONFIRMED,
  },
};

export const GENERAL_FORMULA_BASIS: Basis = {
  kind: "law",
  law: "부가가치세법",
  article: "제37조 제1항·제2항",
  url: VAT_LAW("제37조"),
  effectiveFrom: "2013-07-01",
  appliesTo: "매출세액 = 공급가액 × 10%, 납부세액 = 매출세액 − 매입세액(초과분 환급)",
  confirmedAt: CONFIRMED,
};

export const SIMPLE_FORMULA_BASIS: Basis = {
  kind: "law",
  law: "부가가치세법",
  article: "제63조 제2항",
  url: VAT_LAW("제63조"),
  effectiveFrom: "2020-12-22",
  appliesTo: "간이 납부세액 = 공급대가 × 업종별 부가가치율 × 10%",
  confirmedAt: CONFIRMED,
};

export const FILING_BASIS: Basis = {
  kind: "law",
  law: "부가가치세법",
  article: "제48조·제49조",
  url: VAT_LAW("제48조"),
  effectiveFrom: "2013-07-01",
  appliesTo: "예정신고 4/25·10/25, 확정신고 7/25·다음해 1/25 (과세기간 종료 후 25일)",
  confirmedAt: CONFIRMED,
};

export const INDUSTRY_LABEL: Record<VatIndustry, string> = {
  retail: "소매업·음식점업",
  manufacturing: "제조업·농림어업",
  lodging: "숙박업",
  construction: "건설업·운수창고업·정보통신업",
  professional: "전문·과학기술·부동산 관련",
  other: "그 밖의 서비스업",
};
