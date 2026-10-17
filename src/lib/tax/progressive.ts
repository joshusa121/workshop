import { traced, type Traced } from "./trace";
import type { Bracket, RateEntry } from "./rates";

/** 누진세율표 적용. roundRule은 tax-facts.md에서 확정한 절사 함수를 주입 */
export function applyBrackets(
  base: number,
  table: RateEntry<Bracket[]>,
  label: string,
  roundRule: (n: number) => number,
): Traced {
  const taxBase = Math.max(0, base);
  let tax = 0,
    prev = 0;
  const steps: string[] = [];
  for (const b of table.value) {
    const upper = b.upTo ?? Infinity;
    const span = Math.min(taxBase, upper) - prev;
    if (span <= 0) break;
    tax += span * b.rate;
    steps.push(
      `${prev.toLocaleString("ko-KR")}~${upper === Infinity ? "" : upper.toLocaleString("ko-KR")} 구간 × ${(b.rate * 100).toFixed(1)}% = ${(span * b.rate).toLocaleString("ko-KR")}원`,
    );
    prev = upper;
  }
  return traced(label, roundRule(tax), steps, [table.basis]);
}
