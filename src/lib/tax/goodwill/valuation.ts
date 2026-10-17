import { floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import {
  GOODWILL_DISCOUNT,
  GOODWILL_EXCESS_PROFIT,
  GOODWILL_SOLE_PROPRIETOR_PERIOD,
  GOODWILL_WEIGHTS,
} from "./facts";

export type GoodwillValuationInput = {
  /** 순손익액 [직전 1년, 직전 2년, 직전 3년] — 평가기준일에 가까운 순 */
  netIncomes: [number, number, number];
  /** 평가기준일 현재 자기자본(순자산) */
  equity: number;
};

export type GoodwillValuation = {
  weightedAvg: Traced;
  excessProfit: Traced;
  /** Σ 1/(1+rate)^n, n=1..years */
  annuityFactor: number;
  presentValues: number[];
  goodwill: Traced;
};

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");

/** 현가 계수 합계. 상수를 하드코딩하지 않고 식으로 계산한다(테스트에서 3.7908과 대조) */
export function annuityFactor(rate = GOODWILL_DISCOUNT.value.rate, years = GOODWILL_DISCOUNT.value.years): number {
  let sum = 0;
  for (let n = 1; n <= years; n++) sum += 1 / (1 + rate) ** n;
  return sum;
}

/**
 * 평가액의 원 미만 버림을 분수로 정확히 계산한다 (Phase 3 감사 버그: 현가 합계가 정확히 정수일 때
 * 부동소수 합이 x.9999…가 되어 1원 모자랐다). 가중평균 → 초과이익 → 5년 현가를 BigInt 분수로 이어 계산.
 * 입력이 정수(원)가 아니거나 비율이 소수 6자리를 넘으면 null → 호출부가 부동소수 경로를 쓴다.
 */
function exactGoodwillFloor(netIncomes: readonly number[], equity: number): number | null {
  const weights = GOODWILL_WEIGHTS.value;
  const { profitShare, equityReturn } = GOODWILL_EXCESS_PROFIT.value;
  const { rate, years } = GOODWILL_DISCOUNT.value;
  const SCALE = 1_000_000;
  const frac = (x: number) => {
    const v = Math.round(x * SCALE);
    return Math.abs(v / SCALE - x) < 1e-12 ? BigInt(v) : null;
  };
  const ZERO = BigInt(0);
  if (![...netIncomes, equity, ...weights].every(Number.isInteger)) return null;
  const ps = frac(profitShare), er = frac(equityReturn), r = frac(rate);
  if (ps === null || er === null || r === null) return null;
  const F = BigInt(SCALE);
  const W = BigInt(weights.reduce((a, b) => a + b, 0));
  const syw = netIncomes.reduce((acc, y, i) => acc + BigInt(y) * BigInt(weights[i]), ZERO);
  // 가중평균이 음수면 0으로 본 뒤 초과이익 계산 (valueGoodwill과 같은 순서)
  const avgNum = syw > ZERO ? syw : ZERO; // 가중평균 = avgNum / W
  const excessNum = avgNum * ps - BigInt(equity) * er * W; // 초과이익 = excessNum / (W·F)
  if (excessNum <= ZERO) return 0;
  const base = F + r; // (1 + rate) × F
  let pvSum = ZERO; // Σ F^n · base^(years−n)
  for (let n = 1; n <= years; n++) pvSum += F ** BigInt(n) * base ** BigInt(years - n);
  return Number((excessNum * pvSum) / (W * F * base ** BigInt(years)));
}

export function valueGoodwill(input: GoodwillValuationInput): GoodwillValuation {
  const [y1, y2, y3] = input.netIncomes;
  const [w1, w2, w3] = GOODWILL_WEIGHTS.value;
  const rawAvg = (y1 * w1 + y2 * w2 + y3 * w3) / (w1 + w2 + w3);
  const avg = Math.max(0, rawAvg);
  const weightedAvg = traced(
    "최근 3년 순손익액 가중평균",
    avg,
    [
      `(직전 1년 ${won(y1)} × ${w1} + 직전 2년 ${won(y2)} × ${w2} + 직전 3년 ${won(y3)} × ${w3}) ÷ ${w1 + w2 + w3} = ${won(rawAvg)}`,
      rawAvg < 0 ? "음수이므로 0" : "평가기준일 = 직전 사업연도 말 기준, 개인사업자 3개년 실적 사용",
    ],
    [GOODWILL_WEIGHTS.basis, GOODWILL_SOLE_PROPRIETOR_PERIOD],
  );

  const { profitShare, equityReturn } = GOODWILL_EXCESS_PROFIT.value;
  const profitPart = avg * profitShare;
  const equityPart = input.equity * equityReturn;
  const rawExcess = profitPart - equityPart;
  const excess = Math.max(0, rawExcess);
  const excessProfit = traced(
    "초과이익 (가중평균 × 50% − 자기자본 × 10%)",
    excess,
    [
      `${won(avg)} × ${profitShare * 100}% = ${won(profitPart)}`,
      `자기자본 ${won(input.equity)} × ${equityReturn * 100}% = ${won(equityPart)}`,
      `${won(profitPart)} − ${won(equityPart)} = ${won(rawExcess)}${rawExcess < 0 ? " → 음수이므로 0 (영업권 없음)" : ""}`,
      ...(input.equity < 0
        ? ["자기자본이 마이너스라 평가액이 커졌습니다. 세무사 확인이 필요합니다."]
        : []),
    ],
    [GOODWILL_EXCESS_PROFIT.basis],
  );

  const { rate, years } = GOODWILL_DISCOUNT.value;
  const presentValues: number[] = [];
  for (let n = 1; n <= years; n++) presentValues.push(excess / (1 + rate) ** n);
  const total = presentValues.reduce((a, b) => a + b, 0);
  const goodwillWon = exactGoodwillFloor(input.netIncomes, input.equity) ?? floorWon(total);
  const factor = annuityFactor(rate, years);
  const goodwill = traced(
    "영업권 평가액 (초과이익 5년 현가 합계)",
    goodwillWon,
    [
      ...presentValues.map((pv, i) => `${i + 1}년차: ${won(excess)} ÷ 1.1^${i + 1} = ${won(pv)}`),
      `합계 ${total.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} (= 초과이익 × 계수 ${factor.toFixed(4)}) → 원 미만 버림 ${won(goodwillWon)}`,
    ],
    [GOODWILL_DISCOUNT.basis],
  );

  return { weightedAvg, excessProfit, annuityFactor: factor, presentValues, goodwill };
}
