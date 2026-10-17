import { SINCERE_FILING_THRESHOLDS } from "../rates";
import { traced, type Traced } from "../trace";
import type { IndustryGroup } from "../scenario-input";

export function sincereFilingStatus(
  industryGroup: IndustryGroup,
  revenue: number,
): { isTarget: boolean; threshold: Traced } {
  const thresholdValue = SINCERE_FILING_THRESHOLDS.value[industryGroup];
  const threshold = traced(
    "성실신고확인대상 수입금액 기준",
    thresholdValue,
    [`업종군 ${industryGroup}`],
    [SINCERE_FILING_THRESHOLDS.basis],
  );
  return { isTarget: revenue >= thresholdValue, threshold };
}

/**
 * 직전 연도 매출 추세 선형 외삽. 전제: 연평균 증감이 유지된다.
 * 매출 이력이 2년 미만이면 진입 연도 미확인.
 */
export function sincereFilingTimeline(
  industryGroup: IndustryGroup,
  revenues: { year: number; revenue: number }[],
): { expectedYear: number | null; note: string } {
  const { threshold } = sincereFilingStatus(industryGroup, 0);
  const sorted = [...revenues].sort((a, b) => a.year - b.year);
  const last = sorted[sorted.length - 1];
  if (last && last.revenue >= threshold.value) {
    return { expectedYear: last.year, note: "이미 기준 이상" };
  }
  if (sorted.length < 2) {
    return { expectedYear: null, note: "매출 추이 부족 — 진입 연도 미확인" };
  }
  const recent = sorted.slice(-3);
  const span = recent[recent.length - 1].year - recent[0].year;
  if (span <= 0) return { expectedYear: null, note: "같은 연도만 있어 외삽 불가" };
  const slope = (recent[recent.length - 1].revenue - recent[0].revenue) / span;
  if (slope <= 0) return { expectedYear: null, note: "매출이 늘지 않음 — 진입 연도 미확인 (선형 외삽 전제)" };
  const need = threshold.value - last.revenue;
  const years = Math.ceil(need / slope);
  return {
    expectedYear: last.year + years,
    note: "직전 구간 선형 외삽. 실제 성장과 다를 수 있음",
  };
}
