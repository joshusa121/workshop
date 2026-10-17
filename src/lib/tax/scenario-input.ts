/**
 * 법인전환 시뮬레이터 입력 스키마.
 * 각 필드의 세무상 의미를 주석으로 고정한다 — UI 라벨은 이 의미와 일치해야 한다.
 */

/** 성실신고확인대상 기준 판정용 업종군 — 소득세법 시행령 §133 그룹과 매핑 (값은 tax-facts.md) */
export type IndustryGroup = "농림어업광업도소매" | "제조건설음식숙박" | "서비스임대";

/** 개인 시나리오 기장료 기본값 선택. 기본은 복식부기. */
export type BookkeepingType = "복식부기" | "간편장부";

export type ScenarioInput = {
  /** 연 매출액(공급가액). 성실신고확인대상 판정에 사용. 이익이 아님. */
  revenue: number;
  /** 세전 회계이익(= 매출 - 비용, 세무조정 전). 화면 라벨: "연간 이익(세무조정 전)" */
  accountingProfit: number;
  /** 세무조정액(선택). 사업소득금액 = accountingProfit + taxAdjustment. 기본 0. */
  taxAdjustment: number;
  industryGroup: IndustryGroup;
  /**
   * 사업장 소재지. 과밀억제권역 해당 여부는 이 값으로 판정한다(지방세법 등록면허세 중과).
   * UI는 「과밀억제권역입니까」를 묻지 않고 시·도 / 시·군·구만 고르게 한다.
   * 해당 지역 목록은 tax-facts.md 확정 후 매핑. 경기·인천은 시군구가 있어야 판정 가능.
   */
  workplace: { sido: string; sigungu?: string };
  /**
   * 선택. 최근 연도별 매출(공급가액). 성실신고 진입 연도 추정용.
   * 없으면 올해 revenue만으로 기준 대비 현재 위치만 표시하고, 진입 예상 연도는 미확인.
   */
  revenueHistory?: { year: number; revenue: number }[];
  /** 전환 대상 사업장의 자산. 주택은 이월과세 제외 검토 대상이라 분리 입력. */
  assets: { total: number; realEstate: number; housing: number };
  liabilities: number;
  /** 설립 예정 자본금(원, 선택). 없으면 순자산가액(자산−부채)을 대용. 등록면허세·세감면 자본금 요건에 사용. */
  capital?: number;
  /** 법인 시나리오에서 대표 급여(연, 세전). W5 슬라이더 변수. */
  ownerSalary: number;
  /**
   * 연 배당액(원). 세후 법인이익(기장료 차감 후 현금)을 넘으면 그 현금까지로 자른다. 잔여는 유보.
   * 프리셋 0 / 1,000만 / 2,000만(기본) / 직접 입력. 2천만 초과분은 그로스업·비교과세 경로(§62).
   * v1 스키마의 dividendPayoutRatio는 코덱에서 이 값으로 변환한다.
   */
  dividendAmount: number;
  /** 퇴직급여 설정 여부 — 2차 과세 추정 경로(배당 vs 퇴직)에 반영 */
  retirementPlan: boolean;
  /**
   * 정관 퇴직급여 배수(1·2·3, 기본 2). 법인 손금 한도 = 급여 × 1/10 × 근속 × 배수(영 §44④1호 정관 규정 전제).
   * 소득세 한도(§22③ ×2)는 배수와 무관 — 3배 선택 시 2배 초과분은 근로소득 과세.
   */
  retirementMultiple: 1 | 2 | 3;
  /** 가족 근무자 수(0~2). 법인 시나리오에서만 급여·사용자 4대보험을 법인 비용으로 반영 */
  familyWorkers: number;
  /** 가족 근무자 1인당 연급여(세전). 기본 36,000,000 */
  familySalaryEach: number;
  /**
   * 가족 근무자가 대표와 따로 사는지. 동거 친족은 고용보험 적용 제외, 별거하면 적용.
   * true면 가족 1인당 사업주 고용보험(0.9%+0.25%)·산재보험료를 법인 비용에 더한다 (Josh 2026-09-26 R4).
   * 기본 false(동거로 봄) — 종전 계산과 동일.
   */
  familyLivesSeparately: boolean;
  /**
   * 노란우산공제 가입(개인 시나리오 소득공제, 조특법 §86의3). 기본 true.
   * 납입액은 yellowUmbrellaContribution — 비우면(undefined) 사업소득금액 구간 한도 가득 납입으로 본다. 연 1,800만 초과는 클램프.
   * 법인 시나리오는 계산하지 않고 총급여 8천만 이하일 때 안내만(Josh 감수 후 반영).
   */
  yellowUmbrellaEnabled: boolean;
  yellowUmbrellaContribution?: number;
  /**
   * 창업중소기업 세액감면 적용 중 여부(조특법 §6). 0 = 해당 없음, 0.5 / 1 = 감면율.
   * 개인 시나리오 산출세액(사업소득분)에 적용. 최저한세·농특세 미반영. 법인 시나리오는 승계 안내만(§32④).
   */
  startupReliefRate: 0 | 0.5 | 1;
  /** 감면 남은 연수 1~5 (안내용, 연 단위 모델이라 계산에는 미사용) */
  startupReliefYearsLeft: number;
  /** 컷오프 예외 ②: 사업용 부동산 취득 계획 */
  plansRealEstatePurchase: boolean;
  /** 컷오프 예외 ③: 비세금 사유(대출·거래처·입찰) */
  nonTaxReasons: boolean;
  /**
   * 개인 시나리오 장부 유형. 기장료 기본값(월+조정)을 고른다.
   * 기본 복식부기. 간편장부는 수입금액 기준 해당자만 선택.
   */
  bookkeepingType: BookkeepingType;
  /**
   * 성실신고확인에 지급하는 비용(연) 직접 입력. 0이면 대상자에 한해 전제값(assumptions.sincereConfirmCost, 기본 150만)을 쓴다.
   * 세액공제는 조특법 §126조의6: 지급액×60%, 개인 한도 120만 / 법인 150만.
   * 법인 시나리오도 개인이 대상이면 전환 후 3년(법인세법 §60의2①2호) 같은 방식으로 반영.
   */
  sincereFilingConfirmCost: number;
  /**
   * 등기 대표 고용보험 임의가입. 기본 false(당연가입 아님).
   * 요율표가 tax-facts에 없으면 금액 미계산, 「별도 비용」만 표시.
   */
  voluntaryEmploymentIns: boolean;
  /**
   * 산재 중소기업사업주 임의가입(산재보험법 §124). 기본 false.
   * 요율표가 tax-facts에 없으면 금액 미계산, 「별도 비용」만 표시.
   */
  voluntaryWorkersComp: boolean;
  /**
   * 개인 상황: 타소득(종합과세 합산), 건보 지역가입 재산(선택).
   * propertyForHealthIns 미입력 시 재산보험료 0 + 상시 「재산 미반영 — 실제 부담은 이보다 클 수 있음」.
   * 금액이 있어도 점수 환산표가 tax-facts에 없으면 재산보험료는 계산하지 않는다.
   */
  personalContext: { otherIncome: number; propertyForHealthIns?: number };
  /** W8: 사용자가 수정한 전제 — assumptions.ts 기본값을 덮어씀 */
  overrides?: Partial<import("./assumptions").Assumptions>;
};

/** 전환 대상 사업장 순자산가액 (이월과세·세감면 요건 기준) */
export function netAssetValue(i: ScenarioInput): number {
  return i.assets.total - i.liabilities;
}
