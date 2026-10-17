import type { ScenarioInput } from "./tax/scenario-input";

/** 설립 자본금 기본값 (Josh 2026-09-26). 세감면이 필요하면 순자산가액 이상으로 상향 제안 */
export const DEFAULT_CAPITAL = 50_000_000;
/** 연 배당 기본 프리셋 — 금융소득 종합과세 기준금액(2천만)까지는 14% 원천징수로 종결 */
export const DEFAULT_DIVIDEND_AMOUNT = 20_000_000;
export const DIVIDEND_PRESETS = [0, 10_000_000, 20_000_000] as const;
/** 가족 근무자 1인당 연급여 기본값 */
export const DEFAULT_FAMILY_SALARY = 36_000_000;
/** 대표 급여 상한 기본값(연 7,200만 = 월 600만). 근거는 assumptions.ts SALARY_DEFAULT_BASIS */
export const DEFAULT_SALARY_CAP = 72_000_000;

/** 대표 급여 기본값 = min(이익 × 50%, 7,200만). 10만 원 단위 버림 */
export function defaultOwnerSalary(profit: number): number {
  const half = Math.max(0, profit) * 0.5;
  return Math.floor(Math.min(half, DEFAULT_SALARY_CAP) / 100_000) * 100_000;
}

export const EMPTY_SCENARIO: ScenarioInput = {
  revenue: 0,
  accountingProfit: 0,
  taxAdjustment: 0,
  industryGroup: "서비스임대",
  workplace: { sido: "서울특별시" },
  assets: { total: 0, realEstate: 0, housing: 0 },
  liabilities: 0,
  capital: DEFAULT_CAPITAL,
  ownerSalary: 0,
  dividendAmount: DEFAULT_DIVIDEND_AMOUNT,
  retirementPlan: false,
  retirementMultiple: 2,
  familyWorkers: 0,
  familySalaryEach: DEFAULT_FAMILY_SALARY,
  familyLivesSeparately: false,
  plansRealEstatePurchase: false,
  nonTaxReasons: false,
  yellowUmbrellaEnabled: true,
  startupReliefRate: 0,
  startupReliefYearsLeft: 3,
  bookkeepingType: "복식부기",
  sincereFilingConfirmCost: 0,
  voluntaryEmploymentIns: false,
  voluntaryWorkersComp: false,
  personalContext: { otherIncome: 0 },
};

export const SIDOS = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
] as const;
