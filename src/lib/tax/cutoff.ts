import { sincereFilingStatus, sincereFilingTimeline } from "./conversion/sincere-filing";
import type { ScenarioInput } from "./scenario-input";
import type { Basis } from "./sources";
import { traced, type Traced } from "./trace";

export type CutoffVerdict = "아직 아님" | "검토 구간" | "적극 검토";

export type CutoffResult = {
  verdict: CutoffVerdict;
  /** 판정 기준이 된 사업소득금액 (Traced — 구간·예외 근거 포함) */
  base: Traced;
  /** 예외로 「아직 아님」→「검토 구간」 승격된 사유. 없으면 빈 배열 */
  upgradedBy: string[];
  /** 매출 10억 이상 & 이익 1억 미만 → 비세금 요인 카드 */
  showNonTaxCard: boolean;
};

/** Josh 확정 컷오프 (2026-09-26). 법령값이 아닌 실무 판단 기준 */
export const CUTOFF_REVIEW = 100_000_000;
export const CUTOFF_ACTIVE = 200_000_000;
const NON_TAX_REVENUE = 1_000_000_000;
/** 성실신고 진입이 이 연수 이내로 예상되면 예외 승격 */
const SINCERE_HORIZON_YEARS = 2;
const CURRENT_YEAR = 2026;

const CUTOFF_BASIS: Basis = {
  kind: "assumption",
  description:
    "컷오프는 세무사 실무 판단 기준(Josh 2026-09-26): 사업소득금액 1억 미만 아직 아님 / 1억~2억 검토 구간 / 2억 이상 적극 검토. 예외: 성실신고 진입 2년 이내·사업용 부동산 취득 계획·비세금 사유는 한 단계 승격",
  editable: true,
};

const won = (n: number) => n.toLocaleString("ko-KR");

export function assessCutoff(input: ScenarioInput): CutoffResult {
  const profit = input.accountingProfit + input.taxAdjustment;
  const steps: string[] = [`사업소득금액 = 회계이익 ${won(input.accountingProfit)} + 세무조정 ${won(input.taxAdjustment)} = ${won(profit)}`];

  let verdict: CutoffVerdict;
  if (profit >= CUTOFF_ACTIVE) {
    verdict = "적극 검토";
    steps.push("2억 이상 → 적극 검토");
  } else if (profit >= CUTOFF_REVIEW) {
    verdict = "검토 구간";
    steps.push("1억 이상 2억 미만 → 검토 구간");
  } else {
    verdict = "아직 아님";
    steps.push("1억 미만 → 아직 아님");
  }

  const upgradedBy: string[] = [];
  const { isTarget } = sincereFilingStatus(input.industryGroup, input.revenue);
  const timeline = sincereFilingTimeline(input.industryGroup, input.revenueHistory ?? []);
  if (isTarget) {
    upgradedBy.push("이미 성실신고확인대상");
  } else if (timeline.expectedYear !== null && timeline.expectedYear - CURRENT_YEAR <= SINCERE_HORIZON_YEARS) {
    upgradedBy.push(`성실신고 진입 예상 ${timeline.expectedYear}년 (2년 이내)`);
  }
  if (input.plansRealEstatePurchase) upgradedBy.push("사업용 부동산 취득 계획");
  if (input.nonTaxReasons) upgradedBy.push("비세금 사유(대출·거래처·입찰)");

  if (verdict === "아직 아님" && upgradedBy.length > 0) {
    verdict = "검토 구간";
    steps.push(`예외 승격: ${upgradedBy.join(", ")}`);
  } else if (upgradedBy.length > 0) {
    steps.push(`참고 사유: ${upgradedBy.join(", ")} (판정 변동 없음)`);
  }

  const showNonTaxCard = input.revenue >= NON_TAX_REVENUE && profit < CUTOFF_REVIEW;
  if (showNonTaxCard) steps.push("매출 10억 이상·이익 1억 미만 → 비세금 요인 검토");

  return {
    verdict,
    base: traced("컷오프 판정 기준 사업소득금액", profit, steps, [CUTOFF_BASIS]),
    upgradedBy,
    showNonTaxCard,
  };
}
