import { floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import { LTCG_TABLE1, LTCG_TABLE2 } from "./rates-cgt";

export type LtcgTable = "table1" | "table2" | "none";

/** 공제율. eligible=false 면 표 요건 미달(호출자가 표1로 전환하거나 0 처리) */
export function ltcgRate(
  table: LtcgTable,
  holdYears: number,
  resideYears: number,
): { rate: number; eligible: boolean; steps: string[] } {
  if (table === "none") return { rate: 0, eligible: false, steps: ["장기보유특별공제 대상 아님"] };
  if (table === "table1") {
    const t = LTCG_TABLE1.value;
    if (holdYears < t.startYears) return { rate: 0, eligible: false, steps: [`보유 ${holdYears}년 — 3년 미만이라 공제 없음`] };
    const rate = Math.min(t.cap, t.startRate + (holdYears - t.startYears) * t.perYear);
    return { rate: round4(rate), eligible: true, steps: [`표1 보유 ${holdYears}년 → ${pct(rate)}`] };
  }
  const t = LTCG_TABLE2.value;
  if (holdYears < t.minHoldingYears || resideYears < t.minResidenceYears) {
    return {
      rate: 0,
      eligible: false,
      steps: [`표2 요건 미달 (보유 ${holdYears}년·거주 ${resideYears}년 — 보유 3년·거주 2년 이상 필요)`],
    };
  }
  const hold = Math.min(t.hold.cap, t.hold.startRate + (holdYears - t.hold.startYears) * t.hold.perYear);
  const reside =
    resideYears < t.reside.startYears
      ? t.reside.twoYearsRate
      : Math.min(t.reside.cap, t.reside.startRate + (resideYears - t.reside.startYears) * t.reside.perYear);
  const rate = round4(hold + reside);
  return {
    rate,
    eligible: true,
    steps: [`표2 보유 ${holdYears}년 ${pct(hold)} + 거주 ${resideYears}년 ${pct(reside)} = ${pct(rate)}`],
  };
}

/** 장기보유특별공제액 = 양도차익(과세분) × 공제율, 원 미만 버림 */
export function ltcgDeduction(
  taxableGain: number,
  opts: { table: LtcgTable; holdYears: number; resideYears: number; label?: string },
): Traced {
  const { rate, steps } = ltcgRate(opts.table, opts.holdYears, opts.resideYears);
  const base = Math.max(0, taxableGain);
  const value = floorWon(Math.round(base * rate * 10_000) / 10_000);
  const basis = opts.table === "table2" ? [LTCG_TABLE2.basis] : [LTCG_TABLE1.basis];
  return traced(
    opts.label ?? "장기보유특별공제",
    value,
    [...steps, ...(rate > 0 ? [`${base.toLocaleString("ko-KR")} × ${pct(rate)} = ${value.toLocaleString("ko-KR")}원`] : [])],
    basis,
  );
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
function pct(r: number): string {
  return `${Math.round(r * 1000) / 10}%`;
}
