"use client";

import { useMemo } from "react";
import { findCrossings } from "@/lib/tax/breakeven";
import { resolveAssumptions } from "@/lib/tax/assumptions";
import { runCorporate, runIndividual } from "@/lib/tax/scenario";
import type { ScenarioInput } from "@/lib/tax/scenario-input";
import { formatMan } from "@/lib/won";

export type CompareAxis = "ownerDisposable" | "combinedNetWorth";
/** 차트·탐색에 실제로 쓰는 결과 키. 합산 축은 토글에 따라 가족 실수령 포함 키로 바뀐다 */
export type AxisKey = CompareAxis | "combinedNetWorthWithFamily";
export function axisKey(axis: CompareAxis, includeFamily: boolean): AxisKey {
  return axis === "combinedNetWorth" && includeFamily ? "combinedNetWorthWithFamily" : axis;
}

function series(
  input: ScenarioInput,
  axis: AxisKey,
  max: number,
  samples: number,
): { xs: number[]; indiv: number[]; corp: number[] } {
  const a = resolveAssumptions(input.overrides);
  const xs: number[] = [];
  const indiv: number[] = [];
  const corp: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (max * i) / samples;
    const at = { ...input, accountingProfit: x };
    xs.push(x);
    indiv.push(runIndividual(at, a)[axis].value);
    corp.push(runCorporate(at, a)[axis].value);
  }
  return { xs, indiv, corp };
}

export function BreakEvenChart({
  input,
  axis,
  includeFamily = false,
}: {
  input: ScenarioInput;
  axis: CompareAxis;
  includeFamily?: boolean;
}) {
  const maxX = Math.max(500_000_000, input.accountingProfit * 2);
  const key = axisKey(axis, includeFamily);
  const data = useMemo(() => series(input, key, maxX, 60), [input, key, maxX]);
  const crossings = useMemo(() => {
    const a = resolveAssumptions(input.overrides);
    const f = (x: number) => {
      const at = { ...input, accountingProfit: x };
      return runCorporate(at, a)[key].value - runIndividual(at, a)[key].value;
    };
    return findCrossings(f, 0, maxX, 80, 100_000);
  }, [input, key, maxX]);

  const w = 640;
  const h = 260;
  const pad = { l: 56, r: 12, t: 12, b: 32 };
  const all = [...data.indiv, ...data.corp];
  const yMin = Math.min(0, ...all);
  const yMax = Math.max(1, ...all);
  const xScale = (x: number) => pad.l + ((w - pad.l - pad.r) * x) / maxX;
  const yScale = (y: number) => pad.t + ((h - pad.t - pad.b) * (yMax - y)) / (yMax - yMin);
  const path = (ys: number[]) =>
    ys.map((y, i) => `${i === 0 ? "M" : "L"}${xScale(data.xs[i])} ${yScale(y)}`).join(" ");

  const axisLabel = axis === "ownerDisposable" ? "손에 남는 돈" : includeFamily ? "합산 순자산(가족 실수령 포함)" : "합산 순자산";

  return (
    <figure className="mt-8 break-inside-avoid">
      <figcaption className="mb-2 text-xs text-muted">
        가로축은 연간 이익. 세로축은 {axisLabel}. 대표 급여와 연 배당액은 지금 입력값으로 고정합니다(배당은 회사 현금 범위까지).
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full bg-paper" role="img" aria-label="분기점 차트">
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={h - pad.b} stroke="currentColor" strokeWidth="1" />
        <line
          x1={pad.l}
          y1={h - pad.b}
          x2={w - pad.r}
          y2={h - pad.b}
          stroke="currentColor"
          strokeWidth="1"
        />
        <path d={path(data.indiv)} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d={path(data.corp)} fill="none" stroke="var(--accent)" strokeWidth="1.4" />
        <line
          x1={xScale(input.accountingProfit)}
          y1={pad.t}
          x2={xScale(input.accountingProfit)}
          y2={h - pad.b}
          stroke="currentColor"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        {crossings.map((x) => {
          const i = Math.round((x / maxX) * (data.indiv.length - 1));
          const y = data.indiv[Math.min(data.indiv.length - 1, Math.max(0, i))] ?? 0;
          return <circle key={x} cx={xScale(x)} cy={yScale(y)} r="3.5" fill="var(--accent)" />;
        })}
        <text x={pad.l} y={h - 8} className="fill-muted" fontSize="11">
          0
        </text>
        <text x={w - pad.r} y={h - 8} textAnchor="end" className="fill-muted" fontSize="11">
          {formatMan(maxX)}
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted">
        <span className="mr-4">검은 선 개인</span>
        <span className="text-accent">빨간 선 법인</span>
        {crossings.length === 0
          ? " · 이 구간에서는 역전 없음"
          : ` · 교차 ${crossings.map((x) => formatMan(x)).join(", ")}`}
      </p>
    </figure>
  );
}
