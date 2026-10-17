import type { RateEntry, Bracket } from "../rates";
import type { Basis } from "../sources";

const CONFIRMED = "2026-10-16";
const INH = (조: string) => `https://www.law.go.kr/법령/상속세및증여세법/${조}`;

/** 상속·증여 공통 세율 (상증세법 §26, 증여는 §56이 준용) */
export const INHERITANCE_GIFT_BRACKETS: RateEntry<Bracket[]> = {
  value: [
    { upTo: 100_000_000, rate: 0.1 },
    { upTo: 500_000_000, rate: 0.2 },
    { upTo: 1_000_000_000, rate: 0.3 },
    { upTo: 3_000_000_000, rate: 0.4 },
    { upTo: null, rate: 0.5 },
  ],
  basis: {
    kind: "law",
    law: "상속세 및 증여세법",
    article: "제26조",
    url: INH("제26조"),
    effectiveFrom: "2026-01-01",
    appliesTo: "1억 이하 10% / 5억 이하 20% / 10억 이하 30% / 30억 이하 40% / 초과 50% (누진공제 방식)",
    confirmedAt: CONFIRMED,
  },
};

/** 상속세 기초공제 (§18) */
export const BASIC_DEDUCTION_INHERITANCE: RateEntry<number> = {
  value: 200_000_000,
  basis: {
    kind: "law",
    law: "상속세 및 증여세법",
    article: "제18조",
    url: INH("제18조"),
    effectiveFrom: "2026-01-01",
    appliesTo: "상속세 과세가액에서 2억원",
    confirmedAt: CONFIRMED,
  },
};

/** 일괄공제 5억 (§21①) */
export const LUMP_SUM_DEDUCTION: RateEntry<number> = {
  value: 500_000_000,
  basis: {
    kind: "law",
    law: "상속세 및 증여세법",
    article: "제21조 제1항",
    url: INH("제21조"),
    effectiveFrom: "2019-12-31",
    appliesTo: "기초공제+인적공제와 5억원 중 큰 금액 공제",
    confirmedAt: CONFIRMED,
  },
};

/** 배우자 상속공제 최소 5억 (§19④) */
export const SPOUSE_INHERITANCE_DEDUCTION: RateEntry<number> = {
  value: 500_000_000,
  basis: {
    kind: "law",
    law: "상속세 및 증여세법",
    article: "제19조 제4항",
    url: INH("제19조"),
    effectiveFrom: "2014-01-01",
    appliesTo: "배우자가 실제 상속받은 금액이 없거나 5억원 미만이면 5억원 공제(법정상속분 한도)",
    confirmedAt: CONFIRMED,
  },
};

/** 자녀 1인당 인적공제 5천만 (§20①) */
export const CHILD_PERSONAL_DEDUCTION: RateEntry<number> = {
  value: 50_000_000,
  basis: {
    kind: "law",
    law: "상속세 및 증여세법",
    article: "제20조 제1항",
    url: INH("제20조"),
    effectiveFrom: "2026-01-01",
    appliesTo: "자녀 1인당 5천만원 인적공제",
    confirmedAt: CONFIRMED,
  },
};

/** 증여재산 공제 (§53) */
export const GIFT_DEDUCTION: RateEntry<{ spouse: number; linealAscendant: number; linealDescendant: number; otherRelative: number; minorLinealAscendant: number }> = {
  value: {
    spouse: 600_000_000,
    linealAscendant: 50_000_000,
    linealDescendant: 50_000_000,
    otherRelative: 10_000_000,
    minorLinealAscendant: 20_000_000,
  },
  basis: {
    kind: "law",
    law: "상속세 및 증여세법",
    article: "제53조",
    url: INH("제53조"),
    effectiveFrom: "2025-03-14",
    appliesTo: "배우자 6억 / 직계존속 5천만(미성년 2천만) / 직계비속 5천만 / 기타 친족 1천만 (수증자별 10년 합산)",
    confirmedAt: CONFIRMED,
  },
};

/** 증여세 과세최저한 (§55②) */
export const GIFT_MINIMUM_TAXABLE: RateEntry<number> = {
  value: 500_000,
  basis: {
    kind: "law",
    law: "상속세 및 증여세법",
    article: "제55조 제2항",
    url: INH("제55조"),
    effectiveFrom: "2026-01-01",
    appliesTo: "과세표준이 50만원 미만이면 증여세 부과하지 않음",
    confirmedAt: CONFIRMED,
  },
};

/** 세대생략 할증 (§57 증여 30%, §27 상속 30%) */
export const GENERATION_SKIP_RATE: RateEntry<number> = {
  value: 0.3,
  basis: {
    kind: "law",
    law: "상속세 및 증여세법",
    article: "제57조 제1항",
    url: INH("제57조"),
    effectiveFrom: "2015-12-15",
    appliesTo: "자녀가 아닌 직계비속(손자녀 등)에게 증여 시 산출세액의 30% 가산(미성년 & 20억 초과 40%)",
    confirmedAt: CONFIRMED,
  },
};

export const GIFT_BASIS: Basis = {
  kind: "law",
  law: "상속세 및 증여세법",
  article: "제53조·제55조·제56조",
  url: INH("제53조"),
  effectiveFrom: "2026-01-01",
  appliesTo: "증여세 과세표준 = 증여가액 − 증여재산 공제, 세율은 §26 준용",
  confirmedAt: CONFIRMED,
};

export type Beneficiary = "spouse" | "child" | "grandchild";
