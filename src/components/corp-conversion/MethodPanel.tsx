"use client";

import { conversionCosts, isOvercrowdedZone } from "@/lib/tax/conversion/cost";
import { assessMethods, minCapitalForRelief, reliefLossIfUnmet, reliefVersusCost } from "@/lib/tax/conversion/method";
import { resolveAssumptions } from "@/lib/tax/assumptions";
import type { ScenarioInput } from "@/lib/tax/scenario-input";
import { formatWon } from "@/lib/won";
import { TraceValue } from "./TraceValue";

const TONE = {
  유력: "text-ok",
  가능: "text-ink",
  곤란: "text-accent",
} as const;

export function MethodPanel({ input, showTitle = true }: { input: ScenarioInput; showTitle?: boolean }) {
  const a = resolveAssumptions(input.overrides);
  const methods = [...assessMethods(input)].sort((x, y) => x.rank - y.rank);
  const minCap = minCapitalForRelief(input);
  const loss = reliefLossIfUnmet(input);
  const costs = conversionCosts(input, a);
  const zone = isOvercrowdedZone(input.workplace);
  const rvc = reliefVersusCost(input, a);
  const capital = input.capital ?? minCap.value;
  const capitalShort = typeof input.capital === "number" && input.capital < minCap.value;

  return (
    <section className="mt-14">
      {showTitle && <h2 className="text-xl">전환 방법</h2>}
      <p className="mt-2 text-sm text-muted">
        입력만으로 단정하지 않습니다. 충족·미확인·전문가 확인을 나눠 봅니다.
      </p>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="border-t border-line pt-3">
          <dt className="text-xs text-muted">세감면 최소 자본금 (순자산 대용)</dt>
          <dd className="mt-1">
            <TraceValue t={minCap} />
          </dd>
        </div>
        <div className="border-t border-line pt-3">
          <dt className="text-xs text-muted">감면 미충족 시 손실액</dt>
          <dd className="mt-1">
            <TraceValue t={loss} />
          </dd>
        </div>
        <div className="border-t border-line pt-3">
          <dt className="text-xs text-muted">설립 자본금 → 등록면허세 (지방교육세 포함)</dt>
          <dd className="mt-1">
            <span className="num">{formatWon(capital)}</span>
            <span className="mx-2 text-muted">→</span>
            <TraceValue t={costs.registrationTaxWithEducation} />
            <span className="ml-2 text-xs text-muted">
              {zone === "해당" ? "과밀억제권역 — 3배 중과 반영" : `과밀 ${zone}`}
            </span>
          </dd>
        </div>
        <div className="border-t border-line pt-3">
          <dt className="text-xs text-muted">취득세 (감면 전 → 감면 후)</dt>
          <dd className="mt-1">
            <TraceValue t={costs.acquisitionTax} />
            <span className="mx-2 text-muted">→</span>
            <TraceValue t={costs.acquisitionTaxAfterRelief} />
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 text-sm leading-relaxed">
        {capitalShort && (
          <p className="text-accent">
            세감면을 받으려면 자본금을 순자산가액 {formatWon(minCap.value)} 이상으로 올려 잡아야 합니다 (현재 {formatWon(capital)}).
          </p>
        )}
        <p className="text-muted">금융기관 거래 예정이면 자본금은 신용평가 요소이므로 최소치로 잡지 않는 것이 보통입니다.</p>
        {rvc.preferGeneral && (
          <div>
            <span className="text-warn">세감면을 포기하고 일반 양수도가 유리할 수 있습니다</span> — 감면 실익{" "}
            <TraceValue t={rvc.benefit} /> &lt; 감정평가·법무 비용 <TraceValue t={rvc.cost} />
          </div>
        )}
      </div>

      <ol className="mt-8 divide-y divide-line border-y border-ink">
        {methods.map((m) => (
          <li key={m.method} className="py-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-base">
                <span className="mr-2 text-xs text-muted">{m.rank}순위</span>
                {m.method}
              </h3>
              <span className={`text-xs ${TONE[m.viability]}`}>{m.viability}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{m.note}</p>
            {m.satisfied.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-ok">
                {m.satisfied.map((c) => (
                  <li key={c.id}>충족 · {c.title} — {c.detail}</li>
                ))}
              </ul>
            )}
            {m.unverified.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {m.unverified.map((c) => (
                  <li key={c.id} className={c.result === "미충족" ? "text-accent" : "text-muted"}>
                    {c.result} · {c.title} — {c.detail}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-3 space-y-1 text-sm text-warn">
              {m.expertItems.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
