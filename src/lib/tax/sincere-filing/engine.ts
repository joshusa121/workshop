import { floorWon } from "@/lib/tax/rounding";
import { traced, type Traced } from "@/lib/tax/trace";
import type { Basis } from "@/lib/tax/sources";
import { validateInput, type RevenueGroups, type SincereInput } from "./input";
import { BOOK_BASIS, BOOK_THRESHOLDS, CREDIT_CAP, CREDIT_RATE, GROUP_LABELS, SINCERE_BASIS, SINCERE_THRESHOLDS } from "./rates-sincere";

function compare(amounts: RevenueGroups, thresholds: RevenueGroups, basis: Basis, label: string) {
  const main = amounts.indexOf(Math.max(...amounts));
  const threshold = thresholds[main];
  // 모든 기준으로 나누어떨어지는 공통 기준으로 비교하며 표시용 절사는 판정에 쓰지 않는다.
  const base = thresholds[0];
  const weighted = amounts.reduce((sum, amount, n) => sum + amount * (base / thresholds[n]), 0);
  const converted = floorWon(weighted / (base / threshold));
  return {
    main, reached: weighted >= base,
    total: traced(`${label} 수입 합계`, amounts.reduce((a, b) => a + b, 0), [amounts.join(" + ")], [basis]),
    converted: traced(`${label} 주업종 환산 수입`, converted, [
      `주업종: ${GROUP_LABELS[main]} (수입이 가장 큰 업종군)`,
      ...amounts.map((a, n) => `${GROUP_LABELS[n]} ${a.toLocaleString("ko-KR")} × (${threshold.toLocaleString("ko-KR")} / ${thresholds[n].toLocaleString("ko-KR")})`),
      "합산 환산액은 표시할 때만 원 미만을 버리며, 경계 판정은 원 미만을 버리기 전 금액으로 합니다.",
    ], [basis]),
    threshold: traced(`${label} 주업종 기준`, threshold, ["환산 수입이 이 금액 이상이면 기준 도달"], [basis]),
  };
}
export type SincereResult = {
  target: boolean | null; doubleEntry: boolean | null;
  currentTotal: Traced; previousTotal: Traced; sincereConverted: Traced; bookConverted: Traced;
  sincereThreshold: Traced; bookThreshold: Traced; gap: Traced;
  creditEstimate: Traced; creditAvailable: boolean; deadline: string | null;
};
export function computeSincereFiling(i: SincereInput): SincereResult {
  const errors = validateInput(i);
  if (errors.length) throw new Error(errors.join(" "));
  const s = compare(i.current, SINCERE_THRESHOLDS.value, SINCERE_BASIS, "성실신고");
  const b = compare(i.previous, BOOK_THRESHOLDS.value, BOOK_BASIS, "복식부기");
  const target = i.needsReview ? null : s.reached;
  const doubleEntry = i.needsReview ? null : i.excludedFromSimple || (!i.newBusiness && b.reached);
  const creditAvailable = target === true && i.submitted;
  const credit = creditAvailable ? Math.min(floorWon(i.confirmationCost * 60 / 100), CREDIT_CAP.value) : 0;
  return {
    target, doubleEntry, currentTotal: s.total, previousTotal: b.total,
    sincereConverted: s.converted, bookConverted: b.converted, sincereThreshold: s.threshold, bookThreshold: b.threshold,
    gap: traced("성실신고 기준까지의 차이", s.threshold.value - s.converted.value, ["주업종 기준 − 환산 수입 (양수: 미달, 음수: 초과)"], [SINCERE_BASIS]),
    creditEstimate: traced("확인비용 공제 계산상 한도", credit, [
      creditAvailable ? `min(${i.confirmationCost.toLocaleString("ko-KR")} × 60% 원 미만 버림, 1,200,000)` : "대상자이면서 확인서를 제출하는 경우에만 공제 산식 적용",
      "실제 공제액은 사업소득 관련 소득세 한도와 공제 배제 사유 등을 확인해야 합니다 (Josh 감수).",
    ], [CREDIT_RATE.basis, CREDIT_CAP.basis]),
    creditAvailable,
    deadline: i.needsReview ? null : `${i.year + 1}-${target && i.submitted ? "06-30" : "05-31"}`,
  };
}
