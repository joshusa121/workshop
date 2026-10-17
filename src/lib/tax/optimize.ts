import type { Assumptions } from "./assumptions";
import { runCorporate, type ScenarioResult } from "./scenario";
import type { ScenarioInput } from "./scenario-input";

/** combinedNetWorthWithFamily = 「가족 실수령 포함해서 보기」 토글 ON일 때의 합산 축 */
export type OptimizeAxis = "ownerDisposable" | "combinedNetWorth" | "combinedNetWorthWithFamily";

export type SalaryOptimum = {
  salary: number;
  value: number;
  /** 현재 입력 급여 대비 개선폭 (양수면 개선) */
  gainVsCurrent: number;
  step: number;
};

/**
 * 탐색 축의 평가값. 합산 순자산 축(combinedNetWorth / combinedNetWorthWithFamily)은
 * 「합산 순자산 − 2차 과세 추정」으로 평가한다 (R3, Josh 2026-09-26).
 * 유보금을 나중에 꺼낼 때의 세금(2차 과세)을 빼지 않으면 급여를 안 주고 회사에 쌓아 두는 쪽이
 * 항상 좋아 보여 「급여 0원」이 최적으로 나오는 문제가 있었다.
 */
export function searchValue(r: ScenarioResult, axis: OptimizeAxis): number {
  const gross = r[axis].value;
  return axis === "ownerDisposable" ? gross : gross - r.deferredTaxEst.value;
}

/**
 * 대표 급여를 0~이익 범위에서 step 단위로 전수 스캔해 축 값이 최대인 급여를 찾는다.
 * 차이함수가 비단조(보험 상하한·누진구간·배당 전환점)라 이분 탐색 대신 전수 스캔.
 */
export function findOptimalSalary(
  input: ScenarioInput,
  a: Assumptions,
  axis: OptimizeAxis,
  step = 1_000_000,
): SalaryOptimum {
  const profit = Math.max(0, input.accountingProfit + input.taxAdjustment);
  const evalAt = (salary: number): number => searchValue(runCorporate({ ...input, ownerSalary: salary }, a), axis);
  let best = { salary: 0, value: evalAt(0) };
  for (let s = step; s <= profit; s += step) {
    const v = evalAt(s);
    if (v > best.value) best = { salary: s, value: v };
  }
  const current: ScenarioResult = runCorporate(input, a);
  return { ...best, gainVsCurrent: best.value - searchValue(current, axis), step };
}
