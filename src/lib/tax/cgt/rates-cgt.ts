/**
 * 주택 양도소득세 수치 — docs/verified/cgt-facts.md 에 확정된 값만 기입한다.
 * 종합소득세 기본세율(§55①)·지방소득세 10%는 1화 rates.ts 를 import 한다(복사 금지).
 */
import type { Bracket, RateEntry } from "../rates";

const CONFIRMED = "2026-09-26";
const ITA = "https://www.law.go.kr/법령/소득세법";
const ITA_DEC = "https://www.law.go.kr/법령/소득세법시행령";

/** 단일세율 (§104①1호 괄호·2호·3호·10호). 값은 과세표준에 곱하는 비율 */
export const CGT_FLAT_RATES: RateEntry<{
  housingUnder1y: number;
  housing1to2y: number;
  presale: number;
  unregistered: number;
}> = {
  value: { housingUnder1y: 0.7, housing1to2y: 0.6, presale: 0.6, unregistered: 0.7 },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제104조 제1항 제1호(분양권 60%)·제2호(주택·입주권 1년 이상 2년 미만 60%)·제3호(1년 미만 70%)·제10호(미등기 70%)",
    url: `${ITA}/제104조`,
    effectiveFrom: "2021-06-01",
    appliesTo: "2026년 양도분. 둘 이상 세율 해당 시 큰 산출세액(§104① 후단)",
    confirmedAt: CONFIRMED,
  },
};

/** 조정대상지역 다주택 중과 가산 (§104⑦). 기본세율에 더한다 */
export const CGT_SURCHARGE: RateEntry<{ twoHouses: number; threeOrMore: number }> = {
  value: { twoHouses: 0.2, threeOrMore: 0.3 },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제104조 제7항 (1·2호 +20%p, 3·4호 +30%p, 2년 미만은 단일세율과 비교해 큰 세액)",
    url: `${ITA}/제104조`,
    effectiveFrom: "2021-06-01",
    appliesTo: "양도 당시 조정대상지역 주택. 중과 시 장기보유특별공제 배제(§95②)",
    confirmedAt: CONFIRMED,
  },
};

/** 1세대 1주택 고가주택 기준 (§89①3호). 실지거래가액 합계 초과분만 과세 */
export const HIGH_VALUE_THRESHOLD: RateEntry<number> = {
  value: 1_200_000_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제89조 제1항 제3호 · 시행령 제160조 제1항 (양도차익·장특공제 × (양도가액−12억)/양도가액)",
    url: `${ITA}/제89조`,
    effectiveFrom: "2021-12-08",
    appliesTo: "2021-12-08 이후 양도하는 주택·조합원입주권(§89①4호 단서)",
    confirmedAt: CONFIRMED,
  },
};

/** 1세대 1주택 비과세 요건 (시행령 §154①). 보유 2년, 취득 당시 조정대상지역이면 거주 2년 */
export const ONE_HOUSE_REQUIREMENT: RateEntry<{ holdingYears: number; residenceYearsIfAdjusted: number }> = {
  value: { holdingYears: 2, residenceYearsIfAdjusted: 2 },
  basis: {
    kind: "law",
    law: "소득세법 시행령",
    article: "제154조 제1항 (보유 2년 이상, 취득 당시 조정대상지역은 보유 중 거주 2년 이상) · 제6항(거주기간 = 주민등록 전입~전출)",
    url: `${ITA_DEC}/제154조`,
    effectiveFrom: "2026-07-01",
    appliesTo: "양도일 현재 국내 1주택. 부득이한 사유(§154①1~3호·5호) 면제는 미반영",
    confirmedAt: CONFIRMED,
  },
};

/** 일시적 2주택 (시행령 §155①): 종전주택 취득 후 1년 경과 후 신규 취득, 신규 취득일부터 3년 내 종전주택 양도 */
export const TEMPORARY_TWO_HOUSES: RateEntry<{ minGapYears: number; disposeWithinYears: number }> = {
  value: { minGapYears: 1, disposeWithinYears: 3 },
  basis: {
    kind: "law",
    law: "소득세법 시행령",
    article: "제155조 제1항 · 제156조의2 제3항(입주권) · 제156조의3 제2항(분양권)",
    url: `${ITA_DEC}/제155조`,
    effectiveFrom: "2023-02-28",
    appliesTo: "조정대상지역 여부와 무관하게 3년. 완공 후 3년 내 이사 경로(§156의2④·§156의3③)는 미반영",
    confirmedAt: CONFIRMED,
  },
};

/** 혼인·동거봉양 합가 특례 (시행령 §155④⑤): 합가일·혼인일부터 10년 내 먼저 양도하는 주택 */
export const MERGER_SPECIAL_YEARS: RateEntry<number> = {
  value: 10,
  basis: {
    kind: "law",
    law: "소득세법 시행령",
    article: "제155조 제4항(동거봉양, 60세 이상 직계존속)·제5항(혼인)",
    url: `${ITA_DEC}/제155조`,
    effectiveFrom: "2024-11-12",
    appliesTo: "2026년 양도분. 직계존속 연령 요건은 사용자 확인",
    confirmedAt: CONFIRMED,
  },
};

/** 장기보유특별공제 표1 (§95② 표1): 3년 6%부터 연 2%p, 15년 이상 30% */
export const LTCG_TABLE1: RateEntry<{ startYears: number; startRate: number; perYear: number; cap: number }> = {
  value: { startYears: 3, startRate: 0.06, perYear: 0.02, cap: 0.3 },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제95조 제2항 표 1",
    url: `${ITA}/제95조`,
    effectiveFrom: "2019-01-01",
    appliesTo: "토지·건물(보유 3년 이상) 및 원조합원 입주권의 관리처분 전 양도차익. 미등기·중과주택·승계입주권 배제",
    confirmedAt: CONFIRMED,
  },
};

/** 장기보유특별공제 표2 (§95② 표2): 1세대 1주택(거주 2년 이상). 보유 3년 12%·연 4%p·최대 40% + 거주 2년 8%·3년 12%·연 4%p·최대 40% */
export const LTCG_TABLE2: RateEntry<{
  hold: { startYears: number; startRate: number; perYear: number; cap: number };
  reside: { twoYearsRate: number; startYears: number; startRate: number; perYear: number; cap: number };
  minHoldingYears: number;
  minResidenceYears: number;
}> = {
  value: {
    hold: { startYears: 3, startRate: 0.12, perYear: 0.04, cap: 0.4 },
    reside: { twoYearsRate: 0.08, startYears: 3, startRate: 0.12, perYear: 0.04, cap: 0.4 },
    minHoldingYears: 3,
    minResidenceYears: 2,
  },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제95조 제2항 표 2 · 시행령 제159조의4 (양도일 현재 1주택 + 보유 중 거주 2년 이상)",
    url: `${ITA}/제95조`,
    effectiveFrom: "2021-01-01",
    appliesTo: "2021-01-01 이후 양도분. 거주 2년 미만이면 표 1",
    confirmedAt: CONFIRMED,
  },
};

/** 양도소득 기본공제 (§103①): 연 250만원. 미등기 제외 */
export const CGT_BASIC_DEDUCTION: RateEntry<number> = {
  value: 2_500_000,
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제103조 제1항 제1호",
    url: `${ITA}/제103조`,
    effectiveFrom: "2025-01-01",
    appliesTo: "부동산·부동산에 관한 권리 묶음당 연 1회. 같은 해 다른 양도가 있으면 중복 불가(전제)",
    confirmedAt: CONFIRMED,
  },
};

/** 양도소득세 계산 순서 (§92②③) + 양도차익 = 양도가액 − 필요경비 (§96·§97, 영 §163) */
export const CGT_COMPUTATION_ORDER: RateEntry<{ steps: readonly ["양도차익", "양도소득금액", "과세표준"] }> = {
  value: { steps: ["양도차익", "양도소득금액", "과세표준"] },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제92조 제2항·제3항 (양도차익 → 양도소득금액 → 과세표준 → 산출세액) · 제96조·제97조 (양도가액·필요경비)",
    url: `${ITA}/제92조`,
    effectiveFrom: "2024-01-01",
    appliesTo: "2026년 양도분. 필요경비는 취득가액·자본적지출·양도비(영 §163)",
    confirmedAt: CONFIRMED,
  },
};

/** 재개발·재건축 양도차익 2분법 (시행령 §166). 값은 없고 산식 근거만 */
export const REDEVELOPMENT_FORMULA: RateEntry<{ splitAtApproval: true }> = {
  value: { splitAtApproval: true },
  basis: {
    kind: "law",
    law: "소득세법 시행령",
    article: "제166조 제1항(입주권 양도)·제2항(신축주택 양도)·제5항(장특공제 보유기간) · 법 제95조 제2항(입주권 장특공제는 관리처분 전 양도차익 한정)",
    url: `${ITA_DEC}/제166조`,
    effectiveFrom: "2024-02-29",
    appliesTo: "원조합원. 승계조합원 신축주택 취득시기는 Josh 감수 전 미확정",
    confirmedAt: CONFIRMED,
  },
};

/** 조합원입주권 비과세 (§89①4호): 관리처분일 현재 1세대1주택 요건 충족 + 다른 주택 없음 또는 1주택 취득 후 3년 내 양도 */
export const RIGHT_EXEMPTION: RateEntry<{ disposeWithinYears: number }> = {
  value: { disposeWithinYears: 3 },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제89조 제1항 제4호 가목·나목 (12억 초과분 과세)",
    url: `${ITA}/제89조`,
    effectiveFrom: "2022-01-01",
    appliesTo: "관리처분인가일 현재 §89①3호가목 기존주택 보유 세대. 분양권 미보유",
    confirmedAt: CONFIRMED,
  },
};

/** 분양권 주택 수 산입 기준일 (법률 17477호 부칙 §4) */
export const PRESALE_COUNT_FROM: RateEntry<string> = {
  value: "2021-01-01",
  basis: {
    kind: "law",
    law: "소득세법",
    article: "법률 제17477호 부칙 제4조 · 제89조 제2항",
    url: `${ITA}/제89조`,
    effectiveFrom: "2021-01-01",
    appliesTo: "2021-01-01 이후 취득 분양권부터 1세대1주택 판정·중과 주택 수에 산입",
    confirmedAt: CONFIRMED,
  },
};

/** 예정신고 기한 (§105①1호): 양도일이 속하는 달의 말일부터 2개월 */
export const FILING_DEADLINE: RateEntry<{ monthsAfterMonthEnd: number }> = {
  value: { monthsAfterMonthEnd: 2 },
  basis: {
    kind: "law",
    law: "소득세법",
    article: "제105조 제1항 제1호 (확정신고 제110조: 다음 해 5월)",
    url: `${ITA}/제105조`,
    effectiveFrom: "2010-01-01",
    appliesTo: "부동산·부동산에 관한 권리. 무신고 가산세 20%(국세기본법 §47의2)",
    confirmedAt: CONFIRMED,
  },
};

/** 다주택 중과 유예와 경과조치 (영 §167의10①12의2·§167의3①12의2·§167의11①12·§167의4③6의2). Josh 승인 2026-09-26 */
export const SURCHARGE_GRACE: RateEntry<{
  lastTransferDate: string;
  minHoldingYears: number;
  windowMonths: { standard: number; sixMonthRegion: number };
  lateContractDeadline: { standard: string; sixMonthRegion: string };
  sixMonthRegions: string[];
}> = {
  value: {
    lastTransferDate: "2026-05-09",
    minHoldingYears: 2,
    windowMonths: { standard: 4, sixMonthRegion: 6 },
    lateContractDeadline: { standard: "2026-09-09", sixMonthRegion: "2026-11-09" },
    sixMonthRegions: [
      "서울 성동구", "서울 마포구", "서울 강동구", "서울 영등포구", "서울 양천구", "서울 동작구", "서울 광진구",
      "서울 중구", "서울 종로구", "서울 서대문구", "서울 강서구", "서울 노원구", "서울 성북구", "서울 구로구",
      "서울 동대문구", "서울 관악구", "서울 은평구", "서울 중랑구", "서울 금천구", "서울 강북구", "서울 도봉구",
      "경기 수원시 장안구", "경기 수원시 팔달구", "경기 수원시 영통구", "경기 성남시 수정구", "경기 성남시 중원구",
      "경기 성남시 분당구", "경기 안양시 동안구", "경기 과천시", "경기 용인시 수지구", "경기 광명시", "경기 하남시", "경기 의왕시",
    ],
  },
  basis: {
    kind: "law",
    law: "소득세법 시행령",
    article: "제167조의10 제1항 제12호의2 (가목: 2026-05-09까지 양도 / 나목: 토지거래허가 신청 2026-05-09까지 / 다목: 계약 2026-05-09까지, 계약일부터 4개월·표 지역 6개월)",
    url: `${ITA_DEC}/제167조의10`,
    effectiveFrom: "2026-07-01",
    appliesTo: "보유 2년 이상 주택. 2026-04-23 개정 문언. 경과조치 기간은 계약일을 첫날로 센다",
    confirmedAt: CONFIRMED,
  },
};

/** 조정대상지역 현행 지정 (국토교통부공고 제2026-882호). 법령이 아니라 공고 → 가정값, 사용자 수정 가능 */
export const ADJUSTED_ZONES: RateEntry<{ fullSido: string[]; sigungu: string[] }> = {
  value: {
    fullSido: ["서울"],
    sigungu: [
      "경기 수원시 장안구", "경기 수원시 팔달구", "경기 수원시 영통구", "경기 성남시 수정구", "경기 성남시 중원구",
      "경기 성남시 분당구", "경기 안양시 동안구", "경기 과천시", "경기 용인시 수지구", "경기 광명시", "경기 하남시",
      "경기 의왕시", "경기 화성시 동탄구", "경기 용인시 기흥구", "경기 구리시",
    ],
  },
  basis: {
    kind: "assumption",
    description: "국토교통부공고 제2026-882호(2026-07-01) 지정 현황, 확인 2026-09-26. 이후 지정·해제는 반영 안 됨 — 양도 당시 조정대상지역 여부를 직접 확인해 고치세요",
    editable: true,
  },
};

export type { Bracket };
