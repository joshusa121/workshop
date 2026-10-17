import type { RateEntry } from "../rates";
import type { Basis } from "../sources";

const CONFIRMED = "2026-10-16";
const INH = (조: string) => `https://www.law.go.kr/법령/상속세및증여세법/${조}`;
const INH_DEC = (조: string) => `https://www.law.go.kr/법령/상속세및증여세법시행령/${조}`;

export const PRESUMPTION_BASIS: Basis = {
  kind: "law",
  law: "상속세 및 증여세법",
  article: "제45조 제1항",
  url: INH("제45조"),
  effectiveFrom: "2015-12-15",
  appliesTo:
    "직업·연령·소득·재산 상태로 보아 자력 취득이 어려운 경우 취득자금을 증여받은 것으로 추정(시행령 §34의 경우)",
  confirmedAt: CONFIRMED,
};

export const EXCLUSION_BASIS: Basis = {
  kind: "law",
  law: "상속세 및 증여세법 시행령",
  article: "제34조 제1항 단서",
  url: INH_DEC("제34조"),
  effectiveFrom: "2010-02-18",
  appliesTo:
    "입증되지 않은 금액이 취득가액의 100분의 20과 2억원 중 적은 금액에 미달하면 증여추정 배제",
  confirmedAt: CONFIRMED,
};

export const PROOF_ITEMS_BASIS: Basis = {
  kind: "law",
  law: "상속세 및 증여세법 시행령",
  article: "제34조 제1항",
  url: INH_DEC("제34조"),
  effectiveFrom: "2010-02-18",
  appliesTo: "입증 항목: ① 신고·과세받은 소득금액 ② 신고·과세받은 상속·수증재산 ③ 재산 처분대가·부채부담 금전의 취득 직접 사용액",
  confirmedAt: CONFIRMED,
};

export const SMALL_FUNDS_BASIS: Basis = {
  kind: "law",
  law: "상속세 및 증여세법 시행령",
  article: "제34조 제2항",
  url: INH_DEC("제34조"),
  effectiveFrom: "2020-02-11",
  appliesTo: "취득일 전 10년 이내 취득자금 합계가 5천만원 이상으로서 국세청장이 정하는 금액 이하이면 추정 배제(5천만원 미만은 당연 배제)",
  confirmedAt: CONFIRMED,
};

export const SMALL_FUNDS_THRESHOLD: RateEntry<number> = {
  value: 50_000_000,
  basis: SMALL_FUNDS_BASIS,
};

export const PROOF_RATIO_THRESHOLD: RateEntry<number> = {
  value: 0.2,
  basis: EXCLUSION_BASIS,
};

export const PROOF_ABS_CAP: RateEntry<number> = {
  value: 200_000_000,
  basis: EXCLUSION_BASIS,
};
