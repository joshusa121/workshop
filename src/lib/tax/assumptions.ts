import type { Basis } from "./sources";

/**
 * 시장 추정값. 전부 사용자 수정 가능(W8).
 * 법령 수치가 아님 — tax-facts.md 「가정값」과 같아야 한다.
 */
export type Assumptions = {
  bookkeepingMonthlyCorp: number;
  bookkeepingAdjustmentCorp: number;
  bookkeepingMonthlyIndivDouble: number;
  bookkeepingAdjustmentIndivDouble: number;
  bookkeepingMonthlyIndivSimple: number;
  bookkeepingAdjustmentIndivSimple: number;
  /** 법무·공증 등. 미정 — 기본 0, 「미반영」 */
  incorporationSideCost: number;
  /** 2차 과세 퇴직 경로의 근속연수 가정. 퇴직소득세·임원 한도 계산에 사용 */
  retirementServiceYears: number;
  /** 세감면 포괄양수도·현물출자 시 감정평가 비용 */
  appraisalCost: number;
  /** 현물출자 법원 절차·법무 비용 */
  inKindContributionLegalCost: number;
  /** 성실신고확인비용 기본값(연). 입력이 0이고 대상자일 때 사용 */
  sincereConfirmCost: number;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  bookkeepingMonthlyCorp: 125_000,
  bookkeepingAdjustmentCorp: 900_000,
  bookkeepingMonthlyIndivDouble: 90_000,
  bookkeepingAdjustmentIndivDouble: 420_000,
  bookkeepingMonthlyIndivSimple: 65_000,
  bookkeepingAdjustmentIndivSimple: 320_000,
  incorporationSideCost: 0,
  retirementServiceYears: 10,
  appraisalCost: 2_000_000,
  inKindContributionLegalCost: 5_000_000,
  sincereConfirmCost: 1_500_000,
};

/** 대표 급여 기본값(min(이익×50%, 7,200만))의 근거. 법령값 아님 */
export const SALARY_DEFAULT_BASIS: Basis = {
  kind: "assumption",
  description: "대표 급여 기본값 = 이익의 50%와 연 7,200만 중 작은 쪽. 월 600만은 국민연금 상한 바로 아래 구간, 실무 초기 설정치 (Josh 2026-09-26)",
  editable: true,
};

export const ASSUMPTION_BASIS: Record<keyof Assumptions, Basis> = {
  bookkeepingMonthlyCorp: {
    kind: "assumption",
    description: "서울 소규모 법인 월 기장료. 연 240만(상단)을 월 12.5만+조정 90만으로 분해. 수정 가능",
    editable: true,
  },
  bookkeepingAdjustmentCorp: {
    kind: "assumption",
    description: "법인 연간 조정·신고료. 월 기장과 합쳐 240만. 수정 가능",
    editable: true,
  },
  bookkeepingMonthlyIndivDouble: {
    kind: "assumption",
    description: "개인 복식부기 월 기장료. 연 150만을 월 9만+조정 42만으로 분해. 수정 가능",
    editable: true,
  },
  bookkeepingAdjustmentIndivDouble: {
    kind: "assumption",
    description: "개인 복식 연간 조정·신고료. 수정 가능",
    editable: true,
  },
  bookkeepingMonthlyIndivSimple: {
    kind: "assumption",
    description: "개인 간편장부 월 기장료. 연 110만(실무 90~150 가운데). 수정 가능",
    editable: true,
  },
  bookkeepingAdjustmentIndivSimple: {
    kind: "assumption",
    description: "개인 간편 연간 조정·신고료. 수정 가능",
    editable: true,
  },
  incorporationSideCost: {
    kind: "assumption",
    description: "설립 부대비용(법무·공증). 미정 — 기본 0, 미반영. 수정 가능",
    editable: true,
  },
  retirementServiceYears: {
    kind: "assumption",
    description: "퇴직 경로 근속연수 가정(기본 10년). 근속연수공제·임원 한도가 이 값에 비례. 수정 가능",
    editable: true,
  },
  appraisalCost: {
    kind: "assumption",
    description: "감정평가 비용. 세감면 포괄양수도·현물출자에서 순자산가액 산정용. 실무 초기치 200만 (Josh 2026-09-26). 수정 가능",
    editable: true,
  },
  inKindContributionLegalCost: {
    kind: "assumption",
    description: "현물출자 법원 인가·법무 비용. 실무 초기치 500만 (Josh 2026-09-26). 수정 가능",
    editable: true,
  },
  sincereConfirmCost: {
    kind: "assumption",
    description: "성실신고확인비용 기본값 150만(연). 대상자인데 직접 입력이 없을 때 적용. 수정 가능",
    editable: true,
  },
};

export function resolveAssumptions(overrides?: Partial<Assumptions>): Assumptions {
  return { ...DEFAULT_ASSUMPTIONS, ...overrides };
}

export function bookkeepingAnnual(monthly: number, adjustment: number): number {
  return monthly * 12 + adjustment;
}

export function bookkeepingCost(
  a: Assumptions,
  side: "corp" | "indiv",
  type: "복식부기" | "간편장부" = "복식부기",
): number {
  if (side === "corp") {
    return bookkeepingAnnual(a.bookkeepingMonthlyCorp, a.bookkeepingAdjustmentCorp);
  }
  if (type === "간편장부") {
    return bookkeepingAnnual(a.bookkeepingMonthlyIndivSimple, a.bookkeepingAdjustmentIndivSimple);
  }
  return bookkeepingAnnual(a.bookkeepingMonthlyIndivDouble, a.bookkeepingAdjustmentIndivDouble);
}
