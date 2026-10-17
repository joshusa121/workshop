import type { IndustryGroup } from "./scenario-input";
import type { Basis } from "./sources";

export type Bracket = { upTo: number | null; rate: number }; // upTo null = 최고구간
export type RateEntry<T> = { value: T; basis: Basis };

const CONFIRMED = "2026-09-02";

const ITA = "https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&lsId=001565";
const NHIS_DECREE =
  "https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1001023442";
const NPS_FAQ = "https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0104M0.do";
const FOUR_INSURE = "https://www.4insure.or.kr";

export const INCOME_TAX_BRACKETS: RateEntry<Bracket[]> = {
  value: [
    { upTo: 14_000_000, rate: 0.06 },
    { upTo: 50_000_000, rate: 0.15 },
    { upTo: 88_000_000, rate: 0.24 },
    { upTo: 150_000_000, rate: 0.35 },
    { upTo: 300_000_000, rate: 0.38 },
    { upTo: 500_000_000, rate: 0.4 },
    { upTo: 1_000_000_000, rate: 0.42 },
    { upTo: null, rate: 0.45 },
  ],
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제55조 제1항",
    url: `${ITA} (조문 표 이미지 flSeq=123278409)`,
    effectiveFrom: "2023-01-01",
    appliesTo: "2026년 귀속",
    confirmedAt: CONFIRMED,
  },
};

export const CORP_TAX_BRACKETS: RateEntry<Bracket[]> = {
  value: [
    { upTo: 200_000_000, rate: 0.1 },
    { upTo: 20_000_000_000, rate: 0.2 },
    { upTo: 300_000_000_000, rate: 0.22 },
    { upTo: null, rate: 0.25 },
  ],
  basis: {
    kind: "law",
    law: "법인세법",
    article: "제55조 제1항 제1호",
    url: "https://www.law.go.kr (조문 표 이미지 flSeq=159267795, 159267797)",
    effectiveFrom: "2026-01-01",
    appliesTo: "2026 사업연도 일반 내국법인. 제60조의2제1항제1호 법인은 미반영",
    confirmedAt: CONFIRMED,
  },
};

/**
 * 지방소득세율 10%. 법인지방소득세는 법인세 산출세액 × 10%(엔진에 법인 세액공제 없음).
 * 개인지방소득세는 세액공제·감면을 반영한 결정세액 × 10% — LOCAL_TAX_DETERMINED_BASIS 참조. UI 라벨: 결정세액 × 10%
 */
export const LOCAL_TAX_RATE: RateEntry<number> = {
  value: 0.1,
  basis: {
    kind: "law",
    law: "지방세법",
    article: "제92조·제103조의19·제103조의20 (세율은 국세의 1/10)",
    url: "https://www.law.go.kr (조문 표 미첨부 — Josh 확정 방식)",
    effectiveFrom: "2014-01-01",
    appliesTo: "2026년 귀속 개인·법인지방소득세",
    confirmedAt: CONFIRMED,
  },
};

/**
 * 개인지방소득세는 산출세액이 아니라 결정세액의 10%.
 * 근거는 sources.ts `LOCAL_TAX_DETERMINED_BASIS` (지방세특례제한법 §167의2①). (Josh 2026-09-26 확정)
 */

export const DIVIDEND_GROSSUP: RateEntry<number> = {
  value: 0.1,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제17조 제3항",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001565&lsJoLnkSeq=1000225929&print=print",
    effectiveFrom: "2023-01-01",
    appliesTo: "2026-12-31 이전 지급 배당 10%. 2027-01-01 이후 지급분부터 11%(2025-12-23 개정, 부칙 §1 2호·§14). 이 계산기는 2026 지급분 기준. 2천만원 초과분 중 Gross-up 대상 배당만",
    confirmedAt: CONFIRMED,
  },
};

export const FINANCIAL_INCOME_THRESHOLD: RateEntry<number> = {
  value: 20_000_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제14조 제3항 제6호·제4항",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001565&lsJoLnkSeq=1000225996&print=print",
    effectiveFrom: "2013-01-01",
    appliesTo: "2026년 귀속. 기준금액 계산에 그로스업 미포함(제4항)",
    confirmedAt: CONFIRMED,
  },
};

export const WITHHOLDING_RATE: RateEntry<number> = {
  value: 0.14,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제129조 제1항 제1호 라목·제2호 나목",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001565&lsJoLnkSeq=1000821176&print=print",
    effectiveFrom: "2010-12-27",
    appliesTo: "2026년 귀속 일반 이자·배당 원천징수 및 비교과세(§62)",
    confirmedAt: CONFIRMED,
  },
};

export const SINCERE_FILING_THRESHOLDS: RateEntry<Record<IndustryGroup, number>> = {
  value: {
    농림어업광업도소매: 1_500_000_000,
    제조건설음식숙박: 750_000_000,
    서비스임대: 500_000_000,
  },
  basis: {
    kind: "law",
    law: "소득세법 시행령",
    article: "제133조 제1항",
    url: "https://www.law.go.kr",
    effectiveFrom: "2026-07-01",
    appliesTo: "2026년 귀속 성실신고확인대상 수입금액",
    confirmedAt: CONFIRMED,
  },
};

export const SINCERE_CONFIRM_CREDIT_RATE: RateEntry<number> = {
  value: 0.6,
  basis: {
    kind: "law",
    law: "조세특례제한법",
    article: "제126조의6 제1항",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001584&lsJoLnkSeq=1000684517&print=print",
    effectiveFrom: "2017-12-19",
    appliesTo: "성실신고확인서 제출 시 확인비용의 60%",
    confirmedAt: CONFIRMED,
  },
};

export const SINCERE_CONFIRM_CAP_INDIV: RateEntry<number> = {
  value: 1_200_000,
  basis: {
    kind: "law",
    law: "조세특례제한법",
    article: "제126조의6 제1항 단서",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001584&lsJoLnkSeq=1000684517&print=print",
    effectiveFrom: "2017-12-19",
    appliesTo: "개인 성실신고확인대상사업자 공제세액 한도",
    confirmedAt: CONFIRMED,
  },
};

export const SINCERE_CONFIRM_CAP_CORP: RateEntry<number> = {
  value: 1_500_000,
  basis: {
    kind: "law",
    law: "조세특례제한법",
    article: "제126조의6 제1항 단서",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001584&lsJoLnkSeq=1000684517&print=print",
    effectiveFrom: "2017-12-19",
    appliesTo: "성실신고확인대상 내국법인 공제세액 한도",
    confirmedAt: CONFIRMED,
  },
};

export const EARNED_INCOME_DEDUCTION: RateEntry<{ brackets: Bracket[]; cap: number }> = {
  value: {
    brackets: [
      { upTo: 5_000_000, rate: 0.7 },
      { upTo: 15_000_000, rate: 0.4 },
      { upTo: 45_000_000, rate: 0.15 },
      { upTo: 100_000_000, rate: 0.05 },
      { upTo: null, rate: 0.02 },
    ],
    cap: 20_000_000,
  },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제47조 제1항",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001565&lsJoLnkSeq=1001060719&print=print",
    effectiveFrom: "2020-01-01",
    appliesTo: "2026년 귀속 근로소득공제. 한도 2천만원",
    confirmedAt: CONFIRMED,
  },
};

export type EarnedIncomeCreditLimit = {
  salaryUpTo: number | null;
  start: number;
  reduceFrom: number;
  reduceRate: number;
  floor: number;
};

export const EARNED_INCOME_TAX_CREDIT: RateEntry<{
  calc: { upTo: number; rate: number; excessRate: number; excessBase: number };
  limits: EarnedIncomeCreditLimit[];
}> = {
  value: {
    calc: { upTo: 1_300_000, rate: 0.55, excessRate: 0.3, excessBase: 715_000 },
    limits: [
      { salaryUpTo: 33_000_000, start: 740_000, reduceFrom: 0, reduceRate: 0, floor: 740_000 },
      {
        salaryUpTo: 70_000_000,
        start: 740_000,
        reduceFrom: 33_000_000,
        reduceRate: 0.008,
        floor: 660_000,
      },
      {
        salaryUpTo: 120_000_000,
        start: 660_000,
        reduceFrom: 70_000_000,
        reduceRate: 0.5,
        floor: 500_000,
      },
      {
        salaryUpTo: null,
        start: 500_000,
        reduceFrom: 120_000_000,
        reduceRate: 0.5,
        floor: 200_000,
      },
    ],
  },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제59조 제1항·제2항",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001565&lsJoLnkSeq=1000819712&print=print",
    effectiveFrom: "2015-05-13",
    appliesTo: "2026년 귀속 근로소득세액공제",
    confirmedAt: CONFIRMED,
  },
};

export const STANDARD_TAX_CREDIT_WORKER: RateEntry<number> = {
  value: 130_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제59조의4 제9항 제1호",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000667082&print=print",
    effectiveFrom: "2021-01-01",
    appliesTo: "근로소득 있는 거주자(특별공제 미신청). 법인 대표 급여 구간",
    confirmedAt: CONFIRMED,
  },
};

export const STANDARD_TAX_CREDIT_BIZ: RateEntry<number> = {
  value: 70_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제59조의4 제9항 제2호 나목",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000667082&print=print",
    effectiveFrom: "2021-01-01",
    appliesTo: "근로소득 없는 종합소득자(성실사업자 12만원은 미사용)",
    confirmedAt: CONFIRMED,
  },
};

export const BASIC_DEDUCTION_SELF: RateEntry<number> = {
  value: 1_500_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제50조 제1항 제1호",
    url: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsId=001565&lsJoLnkSeq=1001061037&print=print",
    effectiveFrom: "2015-12-15",
    appliesTo: "2026년 귀속 본인 기본공제. 배우자·부양가족 미반영",
    confirmedAt: CONFIRMED,
  },
};

export const NPS_RATE_BY_YEAR: RateEntry<Record<number, number>> = {
  value: {
    2026: 0.095,
    2027: 0.1,
    2028: 0.105,
    2029: 0.11,
    2030: 0.115,
    2031: 0.12,
    2032: 0.125,
    2033: 0.13,
  },
  basis: {
    kind: "official",
    source: "국민연금공단 연금개혁 FAQ — 2026년부터 매년 0.5%p, 2033년 13%. 2026년 9.5%",
    url: NPS_FAQ,
    confirmedAt: CONFIRMED,
  },
};

export type NpsBasePeriod = {
  from: string;
  to: string;
  floor: number;
  cap: number;
  estimated?: boolean;
};

export const NPS_BASE_PERIODS: RateEntry<NpsBasePeriod[]> = {
  value: [
    { from: "2025-07-01", to: "2026-06-30", floor: 400_000, cap: 6_370_000 },
    { from: "2026-07-01", to: "2027-06-30", floor: 410_000, cap: 6_590_000 },
  ],
  basis: {
    kind: "official",
    source: "국민연금공단 보험료 안내 · 4대사회보험 정보연계센터. 2026년은 상반기 637만+하반기 659만 분할",
    url: FOUR_INSURE,
    confirmedAt: CONFIRMED,
  },
};

export const NHIS_RATE_BY_YEAR: RateEntry<Record<number, number>> = {
  value: { 2026: 0.0719 },
  basis: {
    kind: "law",
    law: "국민건강보험법 시행령",
    article: "제44조 제1항",
    url: NHIS_DECREE,
    effectiveFrom: "2026-01-01",
    appliesTo: "2026년 직장·지역 보험료율 1만분의 719. 연도별 테이블",
    confirmedAt: CONFIRMED,
  },
};

export const NHIS_PROPERTY_POINT_WON: RateEntry<number> = {
  value: 211.5,
  basis: {
    kind: "law",
    law: "국민건강보험법 시행령",
    article: "제44조 제2항",
    url: NHIS_DECREE,
    effectiveFrom: "2026-01-01",
    appliesTo: "2026년 지역가입 재산보험료 부과점수당 금액. 점수 환산표는 없음(재산보험료 미계산)",
    confirmedAt: CONFIRMED,
  },
};

export const LTC_RATE: RateEntry<number> = {
  value: 0.009448,
  basis: {
    kind: "official",
    source: "4대사회보험 정보연계센터 2026년 모의계산 안내 — 보수월액 대비 0.9448%(건보료 × 0.9448/7.19)",
    url: FOUR_INSURE,
    confirmedAt: CONFIRMED,
  },
};

export const CONVERSION_DEFERRAL: RateEntry<{
  methods: readonly ["현물출자", "설립후3개월내포괄양도"];
  housingExcluded: true;
  holdingYears: number;
  stakeDisposalThreshold: number;
}> = {
  value: {
    methods: ["현물출자", "설립후3개월내포괄양도"],
    housingExcluded: true,
    holdingYears: 5,
    stakeDisposalThreshold: 0.5,
  },
  basis: {
    kind: "law",
    law: "조세특례제한법",
    article: "제32조 · 시행령 제29조",
    url: "https://www.law.go.kr",
    effectiveFrom: "2009-12-31",
    appliesTo: "법인전환 양도세 이월과세. 자본금 ≥ 순자산가액. 주택·주택취득권 제외",
    confirmedAt: CONFIRMED,
  },
};

// ───────── 2026-09-13 법제처 Open API 원문 확정분 ─────────
const CONFIRMED_2 = "2026-09-13";
const LOCAL_TAX_ACT = "https://www.law.go.kr/법령/지방세법";

/** 법인 설립 등기 등록면허세. 자본금 × 4/1000, 최저 112,500원. 대도시는 3배 */
export const REGISTRATION_TAX: RateEntry<{ rate: number; minimum: number; metroMultiplier: number }> = {
  value: { rate: 0.004, minimum: 112_500, metroMultiplier: 3 },
  basis: {
    kind: "law",
    law: "지방세법",
    article: "제28조 제1항 제6호 가목 · 제2항 (대도시 100분의 300)",
    url: `${LOCAL_TAX_ACT}/제28조`,
    effectiveFrom: "2026-07-01",
    appliesTo: "영리법인 설립·납입. 대도시 중과 제외 업종(영 §26)·조례 가감(§28⑥)·지방교육세 미반영",
    confirmedAt: CONFIRMED_2,
  },
};

/** 등록면허세(등록분) 납부세액에 부가되는 지방교육세: 100분의 20 */
export const LOCAL_EDUCATION_TAX_ON_REGISTRATION: RateEntry<number> = {
  value: 0.2,
  basis: {
    kind: "law",
    law: "지방세법",
    article: "제151조 제1항 제2호",
    url: `${LOCAL_TAX_ACT}/제151조`,
    effectiveFrom: "2026-01-01",
    appliesTo: "등록에 대한 등록면허세액의 20%. 조례 가감(§151②) 미반영",
    confirmedAt: "2026-09-19",
  },
};

/** 과밀억제권역. 전역 시·도/시와 일부(동 단위) 시. 대도시 = 과밀억제권역 − 산업단지(지방세법 §13②) */
export const OVERCROWDED_ZONES: RateEntry<{ fullSido: string[]; fullSigungu: string[]; partialSigungu: string[]; partialSido: string[] }> = {
  value: {
    fullSido: ["서울"],
    fullSigungu: ["의정부", "구리", "하남", "고양", "수원", "성남", "안양", "부천", "광명", "과천", "의왕", "군포"],
    partialSigungu: ["남양주", "시흥"],
    partialSido: ["인천"],
  },
  basis: {
    kind: "law",
    law: "수도권정비계획법 시행령",
    article: "별표 1 과밀억제권역의 범위(제9조 관련)",
    url: "https://www.law.go.kr/법령/수도권정비계획법시행령",
    effectiveFrom: "2025-10-01",
    appliesTo: "인천(강화·옹진·서구 일부·경제자유구역·남동산단 제외)·남양주(10개 동만)·시흥(반월특수지역 제외)은 동 단위 확인 필요",
    confirmedAt: CONFIRMED_2,
  },
};

/** 취득세 표준세율(유상, 농지 외 4%) + 대도시 법인 설립 5년 내 취득 중과: 표준×3 − 중과기준세율(2%)×2 */
export const ACQUISITION_TAX: RateEntry<{ standard: number; farm: number; surchargeBase: number }> = {
  value: { standard: 0.04, farm: 0.03, surchargeBase: 0.02 },
  basis: {
    kind: "law",
    law: "지방세법",
    article: "제11조 제1항 제7호 · 제13조 제2항 · 제6조 제19호",
    url: `${LOCAL_TAX_ACT}/제11조`,
    effectiveFrom: "2026-07-01",
    appliesTo: "현물출자·사업양수도 부동산(농지 외 가정). 주택 제외. 농특세·지방교육세·중과-감면 결합 순서는 Josh 감수",
    confirmedAt: CONFIRMED_2,
  },
};

const ITA_48 = "https://www.law.go.kr/법령/소득세법/제48조";

/** 근속연수공제 (소득세법 §48①1호). upTo=근속연수, base=구간 시작 누적, perYear=연당 */
export const RETIREMENT_SERVICE_DEDUCTION: RateEntry<{ upTo: number | null; base: number; perYear: number; from: number }[]> = {
  value: [
    { upTo: 5, base: 0, perYear: 1_000_000, from: 0 },
    { upTo: 10, base: 5_000_000, perYear: 2_000_000, from: 5 },
    { upTo: 20, base: 15_000_000, perYear: 2_500_000, from: 10 },
    { upTo: null, base: 40_000_000, perYear: 3_000_000, from: 20 },
  ],
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제48조 제1항 제1호·제2항",
    url: ITA_48,
    effectiveFrom: "2023-01-01",
    appliesTo: "2026년 귀속 퇴직소득. 1년 미만은 1년",
    confirmedAt: CONFIRMED_2,
  },
};

/** 환산급여공제 (소득세법 §48①2호). base=구간 하한까지 누적 공제, rate=초과분 비율 */
export const RETIREMENT_CONVERTED_DEDUCTION: RateEntry<{ upTo: number | null; base: number; rate: number; from: number }[]> = {
  value: [
    { upTo: 8_000_000, base: 0, rate: 1, from: 0 },
    { upTo: 70_000_000, base: 8_000_000, rate: 0.6, from: 8_000_000 },
    { upTo: 100_000_000, base: 45_200_000, rate: 0.55, from: 70_000_000 },
    { upTo: 300_000_000, base: 61_700_000, rate: 0.45, from: 100_000_000 },
    { upTo: null, base: 151_700_000, rate: 0.35, from: 300_000_000 },
  ],
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제48조 제1항 제2호",
    url: ITA_48,
    effectiveFrom: "2023-01-01",
    appliesTo: "환산급여 = (퇴직소득 − 근속연수공제) ÷ 근속연수 × 12",
    confirmedAt: CONFIRMED_2,
  },
};

/** 퇴직소득 산출세액 = 과표 × §55① 세율 ÷ 12 × 근속연수 */
export const RETIREMENT_TAX_FORMULA: RateEntry<{ monthsPerYear: number }> = {
  value: { monthsPerYear: 12 },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제55조 제2항",
    url: "https://www.law.go.kr/법령/소득세법/제55조",
    effectiveFrom: "2015-01-01",
    appliesTo: "2026년 귀속 퇴직소득 산출세액",
    confirmedAt: CONFIRMED_2,
  },
};

/** 임원 퇴직소득 한도 (2020.1.1. 이후 근무분): 퇴직 전 3년 총급여 연평균 × 1/10 × 근무연수 × 2. 초과분은 근로소득 */
export const EXEC_RETIREMENT_LIMIT: RateEntry<{ ratio: number; multiple: number }> = {
  value: { ratio: 0.1, multiple: 2 },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제22조 제3항 단서 (2020년 이후 근무기간 계산식)",
    url: "https://www.law.go.kr/법령/소득세법/제22조",
    effectiveFrom: "2020-01-01",
    appliesTo: "신설 법인(2020년 이후 근무만) 임원. 2012~2019년분 3배 구간은 미반영. 연평균 총급여는 대표 급여로 대용",
    confirmedAt: CONFIRMED_2,
  },
};

/** 법인 임원 퇴직급여 손금 한도 (정관 규정 없을 때): 퇴직 전 1년 총급여 × 1/10 × 근속연수. 초과분 손금불산입 */
export const CORP_EXEC_RETIREMENT_DEDUCTIBLE: RateEntry<{ ratio: number }> = {
  value: { ratio: 0.1 },
  basis: {
    kind: "law",
    law: "법인세법 시행령",
    article: "제44조 제4항 제2호",
    url: "https://www.law.go.kr/법령/법인세법시행령/제44조",
    effectiveFrom: "2026-02-27",
    appliesTo: "정관·지급규정이 있으면 그 금액(제1호). 엔진은 2차 과세 추정에서 손금 효과 미반영(안내만)",
    confirmedAt: CONFIRMED_2,
  },
};

export const ACQUISITION_RELIEF: RateEntry<{ rate: number; sunset: string }> = {
  value: { rate: 0.5, sunset: "2027-12-31" },
  basis: {
    kind: "law",
    law: "지방세특례제한법",
    article: "제57조의2 제4항",
    url: "https://www.law.go.kr",
    effectiveFrom: "2014-01-01",
    appliesTo: "조특법 §32 경로 사업용 고정자산 취득세 50% 경감. 부동산 임대·공급업 제외",
    sunset: "2027-12-31",
    confirmedAt: CONFIRMED,
  },
};

// ---- 2026-09-26 인터뷰 확정 추가 (docs/verified/2026-09-26-interview-facts.md) ----
const CONFIRMED_3 = "2026-09-26";

/** 노란우산공제 소득공제 한도 — 사업소득금액 4구간 (조특법 §86의3①, 2025.3.14 개정 현행) */
export const YELLOW_UMBRELLA_CAPS: RateEntry<{ upTo: number | null; cap: number }[]> = {
  value: [
    { upTo: 40_000_000, cap: 6_000_000 },
    { upTo: 60_000_000, cap: 5_000_000 },
    { upTo: 100_000_000, cap: 4_000_000 },
    { upTo: null, cap: 2_000_000 },
  ],
  basis: {
    kind: "law",
    law: "조세특례제한법",
    article: "제86조의3 제1항 제1호~제4호",
    url: "https://www.law.go.kr/법령/조세특례제한법/제86조의3",
    effectiveFrom: "2025-03-14",
    appliesTo: "사업소득금액 구간별 공제 한도 600/500/400/200만. 법인 대표는 총급여 8천만 이하일 때 근로소득금액 기준. 부동산임대업 비율 축소는 미반영",
    confirmedAt: CONFIRMED_3,
  },
};

/** 공제 대상 부금 연 한도 1,800만 (조특법 시행령 §80의3①) */
export const YELLOW_UMBRELLA_CONTRIBUTION_MAX: RateEntry<number> = {
  value: 18_000_000,
  basis: {
    kind: "law",
    law: "조세특례제한법 시행령",
    article: "제80조의3 제1항",
    url: "https://www.law.go.kr/법령/조세특례제한법시행령/제80조의3",
    effectiveFrom: "2026-02-27",
    appliesTo: "연 1,800만원 이하 납입 공제부금",
    confirmedAt: CONFIRMED_3,
  },
};

/** 법인 대표자 노란우산 공제 요건: 총급여 8천만 이하 (조특법 §86의3① 괄호) */
export const YELLOW_UMBRELLA_CORP_SALARY_LIMIT: RateEntry<number> = {
  value: 80_000_000,
  basis: {
    kind: "law",
    law: "조세특례제한법",
    article: "제86조의3 제1항 (괄호)",
    url: "https://www.law.go.kr/법령/조세특례제한법/제86조의3",
    effectiveFrom: "2025-01-01",
    appliesTo: "법인 대표자로서 총급여 8천만원 이하이면 근로소득금액에서 공제. 엔진은 안내만(계산은 Josh 감수 후)",
    confirmedAt: CONFIRMED_3,
  },
};

/** 창업중소기업 감면 — 법인전환은 창업 아님(§6⑩2호), 잔여 감면기간은 전환 법인이 승계(§32④→§31④, 영 §28④) */
export const STARTUP_RELIEF_CONVERSION: RateEntry<{ newReliefForConvertedCorp: boolean; successionOfRemainingPeriod: boolean; rateOptions: number[]; maxYearsLeft: number }> = {
  value: { newReliefForConvertedCorp: false, successionOfRemainingPeriod: true, rateOptions: [0.5, 1], maxYearsLeft: 5 },
  basis: {
    kind: "law",
    law: "조세특례제한법",
    article: "제6조 제10항 제2호 · 제32조 제4항(제31조 제4항~제6항 준용) · 시행령 제28조 제4항",
    url: "https://www.law.go.kr/법령/조세특례제한법/제32조",
    effectiveFrom: "2026-09-18",
    appliesTo: "개인이 받던 §6①·② 감면의 잔여기간을 §32 방식 전환 법인이 승계. §6⑥ 소규모 감면은 §31④ 열거에 없음(승계 불명확). 감면율은 사용자 선택, 최저한세 미반영. 창업중소기업 감면은 농특세 비과세(농특세법 §4 3호)",
    confirmedAt: CONFIRMED_3,
  },
};

/** 건보 금융소득 절벽: 이자·배당 연 1천만 이하 → 부과 소득에서 제외, 초과 시 전액 (건보법 시행규칙 §44① 단서) */
export const NHIS_FINANCIAL_INCOME_FLOOR: RateEntry<number> = {
  value: 10_000_000,
  basis: {
    kind: "law",
    law: "국민건강보험법 시행규칙",
    article: "제44조 제1항 단서",
    url: "https://www.law.go.kr/법령/국민건강보험법시행규칙/제44조",
    effectiveFrom: "2020-10-30",
    appliesTo: "소득세법 §14③6호 이자·배당 합계 1천만 이하이면 미합산, 초과하면 전액 합산 (직장·지역 공통)",
    confirmedAt: CONFIRMED_3,
  },
};

/** 직장가입자 보수 외 소득월액 공제 연 2천만 (건보법 §71①, 영 §41④) */
export const NHIS_EXTRA_INCOME_DEDUCTION: RateEntry<number> = {
  value: 20_000_000,
  basis: {
    kind: "law",
    law: "국민건강보험법 시행령",
    article: "제41조 제4항 (법 제71조 제1항)",
    url: "https://www.law.go.kr/법령/국민건강보험법시행령/제41조",
    effectiveFrom: "2026-02-19",
    appliesTo: "(연간 보수 외 소득 − 2천만) × 1/12 = 보수 외 소득월액. 상한 고시 금액 미확보 → 상한 미적용",
    confirmedAt: CONFIRMED_3,
  },
};

/** 법인전환 법인의 성실신고확인 승계: 전환 후 3년 이내 사업연도 (법인세법 §60의2①2호, 영 §97의4③④) */
export const CORP_SINCERE_SUCCESSION: RateEntry<{ years: number }> = {
  value: { years: 3 },
  basis: {
    kind: "law",
    law: "법인세법",
    article: "제60조의2 제1항 제2호 · 시행령 제97조의4 제3항·제4항",
    url: "https://www.law.go.kr/법령/법인세법/제60조의2",
    effectiveFrom: "2026-07-01",
    appliesTo: "개인이 설립연도 또는 직전연도에 성실신고확인대상이면 전환 법인(현물출자·사업양수도 등)은 전환 후 3년 이내 사업연도 동안 대상. 엔진은 당해 수입금액 1개 값으로 판정",
    confirmedAt: CONFIRMED_3,
  },
};

/** 고용보험 — 실업급여(근로자·사업주 각 1/2) + 고용안정·직업능력개발(사업주 전액, 150인 미만). 가족 근무자 별거 시 반영(R4) */
export const EMPLOYMENT_INSURANCE: RateEntry<{ unemploymentRate: number; stabilityUnder150: number }> = {
  value: { unemploymentRate: 0.018, stabilityUnder150: 0.0025 },
  basis: {
    kind: "law",
    law: "고용보험 및 산업재해보상보험의 보험료 징수 등에 관한 법률 시행령",
    article: "제12조 (고용보험료율)",
    url: "https://www.law.go.kr/법령/고용보험및산업재해보상보험의보험료징수등에관한법률시행령/제12조",
    effectiveFrom: "2026-01-01",
    appliesTo:
      "2026 보험연도 실업급여 합계 1.8%(근로자·사업주 각 0.9%) + 고용안정·직업능력개발 150인 미만 사업주 0.25% (사업주 합계 1.15%). 2027년 실업급여 2.0%(노사 각 1.0%) 인상 예정(고용보험위원회 2026-09-01 심의)",
    confirmedAt: "2026-09-26",
  },
};

/** 산재보험료율 — 사업종류별(전액 사업주 부담). 엔진 기본값은 기타의 각종사업 대표값 (R4) */
export const WORKPLACE_ACCIDENT_RATE: RateEntry<number> = {
  value: 0.0086,
  basis: {
    kind: "law",
    law: "고용노동부고시",
    article: "제2025-91호 (2026년도 사업종류별 산재보험료율) 별지",
    url: "https://www.law.go.kr/admRulLsInfoP.do?admRulSeq=2100000271450",
    effectiveFrom: "2026-01-01",
    appliesTo:
      "사업종류별 0.56%~18.56%(출퇴근재해 0.6/1000 포함), 2026 평균 1.47%. 엔진은 기타의 각종사업(905) 8.6/1000을 대표 기본값으로 쓰며, 실제 사업종류별·개별실적요율은 공단 확인 필요",
    confirmedAt: "2026-09-26",
  },
};
