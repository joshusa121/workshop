import type { RateEntry } from "../rates";
import type { Basis } from "../sources";

const CONFIRMED = "2026-10-16";
const ITA = (조: string) => `https://www.law.go.kr/법령/소득세법/${조}`;
const LTA = (조: string) => `https://www.law.go.kr/법령/지방세법/${조}`;

/** 추가공제 (소득세법 §51①). 3호·6호 중복 시 6호(한부모)만 적용 */
export const ADDITIONAL_DEDUCTION: RateEntry<{
  elderly: number;
  disabled: number;
  femaleHead: number;
  singleParent: number;
}> = {
  value: {
    elderly: 1_000_000,
    disabled: 2_000_000,
    femaleHead: 500_000,
    singleParent: 1_000_000,
  },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제51조 제1항",
    url: ITA("제51조"),
    effectiveFrom: "2014-01-01",
    appliesTo: "2026년 귀속. 경로우대(70세↑) 100만·장애인 200만·부녀자 50만·한부모 100만",
    confirmedAt: CONFIRMED,
  },
};

/** 자녀세액공제 (소득세법 §59의2①, 8세 이상 기본공제대상 자녀·손자녀) */
export const CHILD_TAX_CREDIT: RateEntry<{
  one: number;
  two: number;
  base3: number;
  perExtra: number;
}> = {
  value: { one: 250_000, two: 550_000, base3: 550_000, perExtra: 400_000 },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제59조의2 제1항",
    url: ITA("제59조의2"),
    effectiveFrom: "2024-12-31",
    appliesTo: "1명 25만 / 2명 55만 / 3명 이상 55만 + (2명 초과 1명당 40만). 출산·입양 공제(§59의2③) 미반영",
    confirmedAt: CONFIRMED,
  },
};

/** 연금계좌세액공제 (소득세법 §59의3①) */
export const PENSION_ACCOUNT_CREDIT: RateEntry<{
  rateBase: number;
  rateLow: number;
  lowIncomeThreshold: number;
  pensionSavingsCap: number;
  combinedCap: number;
}> = {
  value: {
    rateBase: 0.12,
    rateLow: 0.15,
    lowIncomeThreshold: 45_000_000,
    pensionSavingsCap: 6_000_000,
    combinedCap: 9_000_000,
  },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제59조의3 제1항",
    url: ITA("제59조의3"),
    effectiveFrom: "2022-12-31",
    appliesTo: "12%(종합소득금액 4,500만원 이하 15%). 납입 한도 연금저축 600만·합계 900만",
    confirmedAt: CONFIRMED,
  },
};

/** 원천징수대상 사업소득 세율 (소득세법 §129①3호) */
export const BIZ_WITHHOLDING_RATE: RateEntry<number> = {
  value: 0.03,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제129조 제1항 제3호",
    url: ITA("제129조"),
    effectiveFrom: "2010-12-27",
    appliesTo: "원천징수대상 사업소득(프리랜서 등) 100분의 3",
    confirmedAt: CONFIRMED,
  },
};

/** 개인지방소득세 특별징수 (지방세법 §103조의13①) — 원천징수 소득세의 10% */
export const LOCAL_WITHHOLDING_RATE: RateEntry<number> = {
  value: 0.1,
  basis: {
    kind: "law",
    law: "지방세법",
    article: "제103조의13 제1항",
    url: LTA("제103조의13"),
    effectiveFrom: "2014-01-01",
    appliesTo: "원천징수 소득세액의 100분의 10 → 사업소득 3%의 10% = 0.3%",
    confirmedAt: CONFIRMED,
  },
};

/** 종합소득 확정신고 기한 (소득세법 §70①) */
export const FILING_WINDOW: RateEntry<{ from: string; to: string }> = {
  value: { from: "5월 1일", to: "5월 31일" },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제70조 제1항",
    url: ITA("제70조"),
    effectiveFrom: "2010-12-27",
    appliesTo: "과세기간 다음 연도 5월 1일~5월 31일 확정신고",
    confirmedAt: CONFIRMED,
  },
};

/** 사업소득금액 = 총수입금액 − 필요경비 (소득세법 §19②·§27①) */
export const BUSINESS_INCOME_BASIS: Basis = {
  kind: "law",
  law: "소득세법",
  article: "제19조 제2항·제27조 제1항",
  url: ITA("제19조"),
  effectiveFrom: "2010-12-27",
  appliesTo: "사업소득금액 = 총수입금액 − 필요경비(통상적인 것). 초과분은 결손금. 추계 경비율은 미반영(실제 경비 입력 전제)",
  confirmedAt: CONFIRMED,
};

/** 연금보험료공제 (소득세법 §51의3①) — 국민연금 본인부담 */
export const NPS_DEDUCTION_BASIS: Basis = {
  kind: "law",
  law: "소득세법",
  article: "제51조의3 제1항",
  url: ITA("제51조의3"),
  effectiveFrom: "2014-01-01",
  appliesTo: "납입한 공적연금 기여금·개인부담금을 종합소득금액에서 공제. 한도 조항 없음(제3항 총한도 적용)",
  confirmedAt: CONFIRMED,
};

/** 기본공제 1명당 (소득세법 §50①) — 본인·배우자·부양가족 */
export const BASIC_DEDUCTION_PER_PERSON: RateEntry<number> = {
  value: 1_500_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제50조 제1항",
    url: ITA("제50조"),
    effectiveFrom: "2015-12-15",
    appliesTo: "본인·배우자·부양가족 1명당 연 150만원. 배우자·부양가족은 소득요건(소득금액 100만 이하) 전제",
    confirmedAt: CONFIRMED,
  },
};
