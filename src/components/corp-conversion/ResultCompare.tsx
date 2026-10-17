"use client";

import { resolveAssumptions } from "@/lib/tax/assumptions";
import { conversionPayback } from "@/lib/tax/conversion/payback";
import { explainCompare } from "@/lib/tax/explain";
import { findOptimalSalary } from "@/lib/tax/optimize";
import { runCorporate, type ScenarioResult } from "@/lib/tax/scenario";
import type { ScenarioInput } from "@/lib/tax/scenario-input";
import { formatWon } from "@/lib/won";
import { axisKey, BreakEvenChart, type CompareAxis } from "./BreakEvenChart";
import { DividendInput } from "./DividendInput";
import { TraceValue } from "./TraceValue";

type RowKey = "ownerDisposable" | "corpRetained" | "combinedNetWorth" | "combinedNetWorthWithFamily" | "totalBurden" | "deferredTaxEst" | "familyBurden" | "familyDisposable";

/** 라벨은 docs/verified/plain-terms.md 기준. 전문 용어는 괄호 1회 병기 */
const ROWS: { key: RowKey; label: string; familyOnly?: boolean }[] = [
  { key: "ownerDisposable", label: "대표 손에 남는 돈 (가처분)" },
  { key: "corpRetained", label: "회사에 남겨둔 이익 (유보금)" },
  { key: "combinedNetWorth", label: "대표 + 회사 합산 순자산 증가" },
  { key: "totalBurden", label: "총 세금·보험·유지비용" },
  { key: "deferredTaxEst", label: "남겨둔 이익을 나중에 꺼낼 때 세금 (2차 과세) 추정" },
  { key: "familyBurden", label: "가족 세부담 (소득세·보험)", familyOnly: true },
  { key: "familyDisposable", label: "가족 실수령", familyOnly: true },
];

const FAMILY_INCLUDED_NOTE =
  "가족이 받은 급여의 실수령액을 가족 전체 자산으로 보고 더한 값입니다. 가족 명의 돈이므로 대표 개인 돈과는 구분됩니다.";

const SERVICE_YEARS = [5, 10, 15] as const;

const RETAINED_WARNING =
  "법인 돈을 급여나 배당 절차 없이 빼 쓰면 회사가 대표에게 빌려준 돈으로 봅니다. 그 돈에 이자를 계산해 세금을 더 내고, 갚지 않으면 대표 급여로 보아 소득세가 붙습니다.";
const RETAINED_WARNING_PRO = "세무사용 용어: 가지급금 · 인정이자 익금산입 · 상여 처분"; // plain-terms-ignore

export function ResultCompare({
  input,
  indiv,
  corp,
  axis,
  onAxis,
  onSalary,
  onDividend,
  interactive = true,
  includeFamily = false,
  onIncludeFamily,
}: {
  input: ScenarioInput;
  indiv: ScenarioResult;
  corp: ScenarioResult;
  axis: CompareAxis;
  onAxis: (a: CompareAxis) => void;
  onSalary: (n: number) => void;
  /** 연 배당액(원) */
  onDividend: (n: number) => void;
  interactive?: boolean;
  /** 「가족 실수령 포함해서 보기」 — 화면 상태만(공유 URL 미포함). 기본 OFF */
  includeFamily?: boolean;
  onIncludeFamily?: (v: boolean) => void;
}) {
  const profit = input.accountingProfit + input.taxAdjustment;
  const salaryMax = Math.max(profit, input.ownerSalary, 1);
  const explanation = explainCompare(indiv, corp, includeFamily);
  const a = resolveAssumptions(input.overrides);
  const payback = conversionPayback(input, a, includeFamily);
  const combinedKey: RowKey = includeFamily ? "combinedNetWorthWithFamily" : "combinedNetWorth";
  const hasFamily = input.familyWorkers > 0;
  const rows = ROWS.filter((r) => !r.familyOnly || hasFamily);

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl">세부담 비교</h2>
        <div className="flex gap-2 text-xs print:hidden">
          <button
            type="button"
            onClick={() => onAxis("ownerDisposable")}
            className={axis === "ownerDisposable" ? "border-b border-ink" : "text-muted"}
          >
            손에 남는 돈 기준
          </button>
          <button
            type="button"
            onClick={() => onAxis("combinedNetWorth")}
            className={axis === "combinedNetWorth" ? "border-b border-ink" : "text-muted"}
          >
            합산 순자산 기준
          </button>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed">{explanation.join(" ")}</p>

      <table className="mt-6 w-full border-t border-ink text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-2 font-normal">항목</th>
            <th className="py-2 font-normal">개인 유지</th>
            <th className="py-2 font-normal">법인 전환</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key: RowKey = row.key === "combinedNetWorth" ? combinedKey : row.key;
            const label =
              row.key === "familyDisposable"
                ? `${row.label} (${includeFamily ? "합산에 포함됨" : "합산에 미포함"})`
                : row.key === "combinedNetWorth" && includeFamily
                  ? `${row.label} (가족 실수령 포함)`
                  : row.label;
            return (
              <tr key={row.key} className="border-b border-line">
                <td className="py-3 pr-4">
                  {label}
                  {row.key === "combinedNetWorth" && hasFamily && onIncludeFamily && (
                    <button
                      type="button"
                      aria-pressed={includeFamily}
                      onClick={() => onIncludeFamily(!includeFamily)}
                      className={`ml-2 border px-1.5 py-0.5 text-xs print:hidden ${includeFamily ? "border-ink" : "border-line text-muted"}`}
                    >
                      가족 실수령 포함해서 보기
                    </button>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <TraceValue t={indiv[key]} />
                </td>
                <td className="py-3">
                  <TraceValue t={corp[key]} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {hasFamily && includeFamily && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{FAMILY_INCLUDED_NOTE}</p>
      )}
      {hasFamily && !includeFamily && !onIncludeFamily && (
        <p className="mt-3 text-sm text-muted">가족 실수령 {formatWon(corp.familyDisposable.value)}은 합산에서 제외.</p>
      )}
      {hasFamily && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-warn">
          가족에게 주는 급여는 실제로 일한 사실(출근, 맡은 업무, 근무시간)을 증명할 수 있어야 합니다. 일한 실체가 없으면 회사 비용으로 인정받지 못하고 대표가 받은 급여로 보아 세금이 붙습니다.
        </p>
      )}

      {corp.retirementDetail && (
        <dl className="mt-4 grid gap-2 border-l-2 border-line pl-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">정관 3배 — 비용 인정 증가 → 법인세 감소</dt>
            <dd className="mt-1">
              <TraceValue t={corp.retirementDetail.deductibleIncrease} />
              <span className="mx-2 text-muted">→</span>
              <TraceValue t={corp.retirementDetail.corpTaxSaving} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">소득세 한도(2배) 초과분 → 근로소득세</dt>
            <dd className="mt-1">
              <TraceValue t={corp.retirementDetail.excessEarnedTax} />
            </dd>
          </div>
        </dl>
      )}

      {input.retirementPlan && corp.corpRetained.value > 0 && (
        <div className="mt-6 text-sm">
          <p className="text-xs text-muted">근속연수에 따른 2차 과세 추정 (퇴직 경로 포함, 낮은 쪽)</p>
          <table className="mt-2 w-full max-w-md border-t border-line">
            <thead>
              <tr className="text-left text-xs text-muted">
                {SERVICE_YEARS.map((y) => (
                  <th key={y} className={`py-2 font-normal ${y === a.retirementServiceYears ? "text-ink" : ""}`}>
                    {y}년{y === a.retirementServiceYears ? " (현재 전제)" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                {SERVICE_YEARS.map((y) => (
                  <td key={y} className="py-2">
                    <TraceValue t={runCorporate(input, { ...a, retirementServiceYears: y }).deferredTaxEst} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className={`mt-8 grid gap-6 md:grid-cols-2 ${interactive ? "" : "hidden"}`}>
        <label className="block text-sm">
          <span className="flex items-baseline justify-between gap-3">
            <span>대표 급여 {formatWon(input.ownerSalary)}</span>
            <button
              type="button"
              className="text-xs text-muted underline decoration-dotted underline-offset-4 hover:text-ink print:hidden"
              onClick={() => {
                const o = findOptimalSalary(input, a, axisKey(axis, includeFamily));
                onSalary(o.salary);
              }}
            >
              {axis === "ownerDisposable" ? "손에 남는 돈" : "합산 순자산(꺼낼 때 세금 뺀 값)"} 최대 급여 찾기
            </button>
          </span>
          <input
            type="range"
            min={0}
            max={salaryMax}
            step={100_000}
            value={input.ownerSalary}
            onChange={(e) => onSalary(Number(e.target.value))}
            className="mt-2 w-full accent-accent"
          />
        </label>
        <DividendInput value={input.dividendAmount} onChange={onDividend} hasFamily={hasFamily} />
      </div>

      <div className="mt-6 text-sm leading-relaxed">
        전환 일회성 비용 <TraceValue t={payback.oneTimeCost} /> → 연간 합산 순자산 차이{" "}
        <TraceValue t={payback.annualGain} /> →{" "}
        {payback.years === null ? (
          <span className="text-accent">{payback.note}</span>
        ) : (
          <>
            회수 약 <span className="num">{payback.years}</span>년
            <span className="ml-2 text-xs text-muted">{payback.note}</span>
          </>
        )}
      </div>

      <div className="mt-8 border-l-2 border-warn pl-4 text-sm leading-relaxed">
        <p className="text-xs text-warn">회사에 남겨둔 이익을 꺼낼 때</p>
        <p className="mt-1">{RETAINED_WARNING}</p>
        <p className="mt-1 text-muted">회사 주식을 회사가 되사는 방법(자기주식)과 자본금을 줄이는 방법(감자)은 미반영 — 전문가 확인.</p>
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer underline decoration-dotted underline-offset-4">근거 (세무사용)</summary>
          <p className="mt-1">{RETAINED_WARNING_PRO}</p>
        </details>
      </div>

      {profit > 0 && <BreakEvenChart input={input} axis={axis} includeFamily={includeFamily} />}
    </section>
  );
}
