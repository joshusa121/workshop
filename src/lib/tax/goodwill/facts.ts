import type { Bracket, RateEntry } from "../rates";
import type { Basis } from "../sources";

/**
 * 영업권 계산기 전용 법령값. 출처: docs/verified/goodwill-facts.md (2026-09-26 확정).
 * 세율표·지방세·단수 규칙은 ../rates.ts, ../rounding.ts 재사용.
 */
const CONFIRMED = "2026-09-26";
const ITA_DECREE = "https://www.law.go.kr/법령/상속세및증여세법시행령";
const ITA_RULE = "https://www.law.go.kr/법령/상속세및증여세법시행규칙";

/** 최근 3년 순손익액 가중평균 가중치 [직전 1년, 직전 2년, 직전 3년] ÷ 6. 음수는 0 */
/**
 * 2화 영업권 계산기 공유 링크의 세율 버전. 1화 RATES_VERSION과 분리(Josh 2026-09-26) — 1화 세율만 바뀌어도
 * 이 제품 링크에 「세법 개정」 배너가 뜨지 않게 한다. 이 파일의 값이나 1화와 공유하는
 * INCOME_TAX_BRACKETS·CORP_TAX_BRACKETS·LOCAL_TAX_RATE·BASIC_DEDUCTION_SELF가 바뀌면 올린다. 올리는 것을 잊으면 __tests__/rates-version-guard.test.ts 가 실패한다.
 */
export const GOODWILL_RATES_VERSION = "2026-3";

export const GOODWILL_WEIGHTS: RateEntry<[number, number, number]> = {
  value: [3, 2, 1],
  basis: {
    kind: "law",
    law: "상속세 및 증여세법 시행령",
    article: "제56조 제1항 (제59조 제2항 준용) — 평가기준일 이전 1년×3 + 2년×2 + 3년×1 ÷ 6, 음수면 0",
    url: `${ITA_DECREE}/제56조`,
    effectiveFrom: "2026-09-18",
    appliesTo: "영업권 초과이익 계산용 순손익액 가중평균",
    confirmedAt: CONFIRMED,
  },
};

/** 초과이익 = 가중평균 × 50% − 자기자본 × 10% */
export const GOODWILL_EXCESS_PROFIT: RateEntry<{ profitShare: number; equityReturn: number }> = {
  value: { profitShare: 0.5, equityReturn: 0.1 },
  basis: {
    kind: "law",
    law: "상속세 및 증여세법 시행령",
    article: "제59조 제2항 · 시행규칙 제19조 제1항 (자기자본 × 100분의 10)",
    url: `${ITA_DECREE}/제59조`,
    effectiveFrom: "2026-09-18",
    appliesTo: "영업권 보충적 평가. 평가기준일 현재 자기자본",
    confirmedAt: CONFIRMED,
  },
};

/** 초과이익을 지속연수 5년 동안 연 10%로 현가 환산: Σ 초과이익 ÷ 1.1^n */
export const GOODWILL_DISCOUNT: RateEntry<{ rate: number; years: number }> = {
  value: { rate: 0.1, years: 5 },
  basis: {
    kind: "law",
    law: "상속세 및 증여세법 시행규칙",
    article: "제16조 제2항 (각 연도 금액 ÷ (1+10/100)^n 합계) · 시행령 제59조 제2항 (지속연수 5년)",
    url: `${ITA_RULE}/제16조`,
    effectiveFrom: "2026-03-20",
    appliesTo: "영업권 평가액 현가 환산. 현가 계수 합 3.7908",
    confirmedAt: CONFIRMED,
  },
};

/** 개인사업자 기간 포함 요건 — 계산기는 충족을 전제로 개인 3개년 실적을 쓴다 */
export const GOODWILL_SOLE_PROPRIETOR_PERIOD: Basis = {
  kind: "assumption",
  description:
    "상증령 §59② 괄호·§55③2호 각 목(현물출자 또는 조특령 §29② 사업양수도 전환 + 법인이 무형자산 계속 사용 + 개인·법인 영위기간 합계 3년 이상) 충족을 전제로 개인 3개년 순손익액을 그대로 사용. 미충족 시 세무사 확인",
  editable: true,
};

export const OTHER_INCOME_EXPENSE_RATE: RateEntry<number> = {
  value: 0.6,
  basis: {
    kind: "law",
    law: "소득세법 시행령",
    article: "제87조 제1호의2 (제21조 제1항 제7호 영업권 양도 대가: 받은 금액의 100분의 60)",
    url: "https://www.law.go.kr/법령/소득세법시행령/제87조",
    effectiveFrom: "2026-07-01",
    appliesTo: "실제 필요경비가 60%를 초과하면 실제 경비(미반영)",
    confirmedAt: CONFIRMED,
  },
};

export const OTHER_INCOME_WITHHOLDING_RATE: RateEntry<number> = {
  value: 0.2,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제129조 제1항 제6호 라목 (그 밖의 기타소득: 기타소득금액의 100분의 20)",
    url: "https://www.law.go.kr/법령/소득세법/제129조",
    effectiveFrom: "2026-07-01",
    appliesTo: "영업권 양도 기타소득(제21조 제1항 제7호). 지방소득세는 산출 × 10% 규칙",
    confirmedAt: CONFIRMED,
  },
};

export const OTHER_INCOME_SEPARATE_LIMIT: RateEntry<number> = {
  value: 3_000_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제14조 제3항 제8호 가목 (기타소득금액 300만원 이하 분리과세 선택)",
    url: "https://www.law.go.kr/법령/소득세법/제14조",
    effectiveFrom: "2026-07-01",
    appliesTo: "300만원 초과 기타소득금액은 종합과세 합산",
    confirmedAt: CONFIRMED,
  },
};

export const GOODWILL_OTHER_INCOME_CLASS: Basis = {
  kind: "law",
  law: "소득세법",
  article: "제21조 제1항 제7호 (영업권 양도 대가 = 기타소득). 사업용 토지·건물과 함께 양도하면 제94조 제1항 제4호 가목 양도소득",
  url: "https://www.law.go.kr/법령/소득세법/제21조",
  effectiveFrom: "2026-07-01",
  appliesTo: "부동산 없이 영업권만 양도하는 경우",
  confirmedAt: CONFIRMED,
};

export const GOODWILL_AMORTIZATION: RateEntry<{ years: number; method: "정액법" }> = {
  value: { years: 5, method: "정액법" },
  basis: {
    kind: "law",
    law: "법인세법 시행령",
    article: "제26조 제1항 제1호 (무형자산 정액법) · 시행규칙 별표 3 (영업권 내용연수 5년) · 제24조 제1항 제2호 가목",
    url: "https://www.law.go.kr/법령/법인세법시행규칙/별표3",
    effectiveFrom: "2026-07-01",
    appliesTo: "영업권 취득가액 5년 균등 손금. 첫해 월할 미반영",
    confirmedAt: CONFIRMED,
  },
};

export const CORP_TAX_BASE_ASSUMPTION: Basis = {
  kind: "assumption",
  description: "법인 과세표준은 5년간 입력값과 동일하다고 가정. 결손 시 이월결손금 효과 미반영",
  editable: true,
};

export const CORP_SAVING_DISCOUNT_ASSUMPTION: Basis = {
  kind: "assumption",
  description: "법인 절세액 현가 할인율 기본 0%(명목 합계). 수정 가능",
  editable: true,
};

export const PRICE_EQUALS_VALUATION: Basis = {
  kind: "assumption",
  description: "양도대가 = 상증법 평가액. 평가액을 넘는 대가는 부당행위계산·상여 처분 위험이 있어 평가액을 상한으로 본다",
  editable: true,
};

export const BASIC_DEDUCTION_ONLY: Basis = {
  kind: "assumption",
  description: "종합과세 추가 세부담은 본인 기본공제 150만원만 적용해 합산 전·후 차액으로 계산(1화와 동일). 그 외 공제 미반영",
  editable: true,
};

export type { Bracket };
