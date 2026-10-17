"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { defaultOwnerSalary, EMPTY_SCENARIO, SIDOS } from "@/lib/default-scenario";
import { yellowUmbrellaCap } from "@/lib/tax/deductions";
import { YELLOW_UMBRELLA_CORP_SALARY_LIMIT } from "@/lib/tax/rates";
import { decodeScenario, encodeScenario } from "@/lib/share-codec";
import { resolveAssumptions, type Assumptions } from "@/lib/tax/assumptions";
import { runCorporate, runIndividual } from "@/lib/tax/scenario";
import type { IndustryGroup, ScenarioInput } from "@/lib/tax/scenario-input";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { type CompareAxis } from "./BreakEvenChart";
import { MethodPanel } from "./MethodPanel";
import { ResultCompare } from "./ResultCompare";
import { DividendInput } from "./DividendInput";
import { ShareButton } from "./ShareButton";
import { SummaryCard } from "./SummaryCard";
import { TimingPanel } from "./TimingPanel";
import { LINK_ERROR_NEXT } from "@/lib/link-error";

const STEPS = ["기본", "자산", "급여·전제"] as const;

function ManInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (won: number) => void;
}) {
  const man = value / 10_000;
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <span className="mt-1 flex items-baseline gap-2 border-b border-ink">
        <input
          type="number"
          className="num w-full bg-transparent py-2 outline-none"
          value={man === 0 ? "" : man}
          onChange={(e) => onChange((Number(e.target.value) || 0) * 10_000)}
        />
        <span className="text-xs text-muted">만원</span>
      </span>
    </label>
  );
}

export function Wizard() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  // 공유 링크(?s=)는 첫 렌더에서 한 번만 읽는다. Suspense 안이라 서버는 fallback을 내고 클라이언트에서만 실행된다(2화와 같은 방식)
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    if (!s) return { input: EMPTY_SCENARIO, fromLink: false, ratesChanged: false, linkError: null as string | null };
    const d = decodeScenario(s);
    return d.ok
      ? { input: d.input, fromLink: true, ratesChanged: d.ratesChanged, linkError: null as string | null }
      : { input: EMPTY_SCENARIO, fromLink: false, ratesChanged: false, linkError: d.reason as string | null };
  });
  const [input, setInput] = useState<ScenarioInput>(initial.input);
  const { ratesChanged, linkError } = initial;
  // 최적 급여 탐색·차트 기본 축 = 합산 순자산 (Josh 2026-09-26)
  const [axis, setAxis] = useState<CompareAxis>("combinedNetWorth");
  // 대표 급여를 직접 만지기 전까지는 이익 변경 시 기본값 min(이익×50%, 7,200만)을 따라간다. 링크로 연 값은 사용자가 정한 값으로 본다
  const [salaryTouched, setSalaryTouched] = useState(initial.fromLink);
  // 「가족 실수령 포함해서 보기」 — 화면 상태만, 공유 URL에 넣지 않는다 (Josh 2026-09-26)
  const [includeFamily, setIncludeFamily] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("s", encodeScenario(input));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, searchParams]);

  const patch = (partial: Partial<ScenarioInput>) => setInput((prev) => ({ ...prev, ...partial }));
  const patchProfit = (partial: Pick<ScenarioInput, "accountingProfit"> | Pick<ScenarioInput, "taxAdjustment">) =>
    setInput((prev) => {
      const next = { ...prev, ...partial };
      return salaryTouched ? next : { ...next, ownerSalary: defaultOwnerSalary(next.accountingProfit + next.taxAdjustment) };
    });
  const setSalary = (ownerSalary: number) => {
    setSalaryTouched(true);
    patch({ ownerSalary });
  };
  const a = resolveAssumptions(input.overrides);
  const indiv = useMemo(() => runIndividual(input, a), [input, a]);
  const corp = useMemo(() => runCorporate(input, a), [input, a]);
  const needsSigungu = input.workplace.sido.includes("경기") || input.workplace.sido.includes("인천");
  const encoded = encodeScenario(input);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">01 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">법인전환 시뮬레이터</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        세금 한 줄로 뭉개지 않습니다. 손에 남는 돈, 회사에 남는 이익, 합산, 부담, 나중에 꺼낼 때 세금을 나눠 봅니다.
      </p>

      {ratesChanged && (
        <p className="mt-6 border border-warn px-3 py-2 text-sm text-warn">
          세법 개정으로 결과가 달라질 수 있습니다.
        </p>
      )}
      {linkError && (
        <p className="mt-6 border border-accent px-3 py-2 text-sm text-accent">{linkError} — {LINK_ERROR_NEXT}</p>
      )}

      <ol className="mt-10 flex gap-6 text-sm">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={i === step ? "border-b border-ink" : "text-muted"}
            >
              {i + 1} {label}
            </button>
          </li>
        ))}
      </ol>

      <form className="mt-8 max-w-xl space-y-6" onSubmit={(e) => e.preventDefault()}>
        {step === 0 && (
          <>
            <ManInput
              label="연 매출 (공급가액)"
              hint="성실신고 판정용. 이익이 아닙니다."
              value={input.revenue}
              onChange={(revenue) => patch({ revenue })}
            />
            <ManInput
              label="연간 이익 (세무조정 전)"
              hint="기장료를 이미 뺀 뒤의 이익으로 넣습니다."
              value={input.accountingProfit}
              onChange={(accountingProfit) => patchProfit({ accountingProfit })}
            />
            <ManInput
              label="세무조정액 (선택)"
              value={input.taxAdjustment}
              onChange={(taxAdjustment) => patchProfit({ taxAdjustment })}
            />
            <label className="block text-sm">
              업종군
              <select
                className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                value={input.industryGroup}
                onChange={(e) => patch({ industryGroup: e.target.value as IndustryGroup })}
              >
                <option value="서비스임대">서비스·임대 (기준 5억)</option>
                <option value="제조건설음식숙박">제조·건설·음식·숙박 (기준 7.5억)</option>
                <option value="농림어업광업도소매">농림·도소매 등 (기준 15억)</option>
              </select>
            </label>
            <label className="block text-sm">
              장부 유형
              <select
                className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                value={input.bookkeepingType}
                onChange={(e) =>
                  patch({ bookkeepingType: e.target.value === "간편장부" ? "간편장부" : "복식부기" })
                }
              >
                <option value="복식부기">복식부기</option>
                <option value="간편장부">간편장부</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <ManInput
                label="직전전년 매출 (선택)"
                value={input.revenueHistory?.[0]?.revenue ?? 0}
                onChange={(revenue) =>
                  patch({
                    revenueHistory: [
                      { year: 2024, revenue },
                      { year: 2025, revenue: input.revenueHistory?.[1]?.revenue ?? 0 },
                    ],
                  })
                }
              />
              <ManInput
                label="직전년 매출 (선택)"
                value={input.revenueHistory?.[1]?.revenue ?? 0}
                onChange={(revenue) =>
                  patch({
                    revenueHistory: [
                      { year: 2024, revenue: input.revenueHistory?.[0]?.revenue ?? 0 },
                      { year: 2025, revenue },
                    ],
                  })
                }
              />
            </div>
            <fieldset className="space-y-2 text-sm">
              <legend className="text-xs text-muted">세금 외 사정 (판정에 반영)</legend>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={input.plansRealEstatePurchase}
                  onChange={(e) => patch({ plansRealEstatePurchase: e.target.checked })}
                />
                사업용 부동산을 살 계획이 있습니다
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={input.nonTaxReasons}
                  onChange={(e) => patch({ nonTaxReasons: e.target.checked })}
                />
                대출·거래처·입찰 때문에 법인이 필요합니다
              </label>
            </fieldset>
            <fieldset className="space-y-2 text-sm">
              <legend className="text-xs text-muted">창업중소기업 세액감면</legend>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={input.startupReliefRate > 0}
                  onChange={(e) => patch({ startupReliefRate: e.target.checked ? 0.5 : 0 })}
                />
                현재 창업중소기업 세액감면을 적용받는 중
              </label>
              {input.startupReliefRate > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    감면율
                    <select
                      className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                      value={input.startupReliefRate}
                      onChange={(e) => patch({ startupReliefRate: Number(e.target.value) === 1 ? 1 : 0.5 })}
                    >
                      <option value={0.5}>50%</option>
                      <option value={1}>100%</option>
                    </select>
                  </label>
                  <label className="block">
                    남은 연수
                    <select
                      className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                      value={input.startupReliefYearsLeft}
                      onChange={(e) => patch({ startupReliefYearsLeft: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map((y) => (
                        <option key={y} value={y}>{y}년</option>
                      ))}
                    </select>
                  </label>
                  <p className="col-span-2 text-xs leading-relaxed text-muted">
                    개인 유지 쪽 세금에 감면율을 적용합니다(최저한세 미반영). 법인전환은 새 창업이 아니므로 새로 감면을 받을 수는 없지만, 개인이 받던 남은 기간은 법인이 이어받을 수 있습니다(조특법 §32④). 이어받는 절차와 요건은 세무사 확인이 필요합니다.
                  </p>
                </div>
              )}
            </fieldset>
          </>
        )}

        {step === 1 && (
          <>
            <label className="block text-sm">
              사업장 시·도
              <select
                className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                value={input.workplace.sido}
                onChange={(e) => patch({ workplace: { ...input.workplace, sido: e.target.value } })}
              >
                {SIDOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {needsSigungu && (
              <label className="block text-sm">
                시·군·구
                <span className="mt-0.5 block text-xs text-muted">
                  과밀억제권역 판정용. 인천·남양주·시흥은 일부 동만 해당해 미확인으로 남습니다.
                </span>
                <input
                  className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                  value={input.workplace.sigungu ?? ""}
                  onChange={(e) =>
                    patch({ workplace: { ...input.workplace, sigungu: e.target.value } })
                  }
                />
              </label>
            )}
            <ManInput
              label="자산 합계"
              value={input.assets.total}
              onChange={(total) => patch({ assets: { ...input.assets, total } })}
            />
            <ManInput
              label="그중 부동산"
              value={input.assets.realEstate}
              onChange={(realEstate) => patch({ assets: { ...input.assets, realEstate } })}
            />
            <ManInput
              label="그중 주택"
              hint="주택·주택취득권은 이월과세에서 빠질 수 있습니다."
              value={input.assets.housing}
              onChange={(housing) => patch({ assets: { ...input.assets, housing } })}
            />
            <ManInput
              label="부채"
              value={input.liabilities}
              onChange={(liabilities) => patch({ liabilities })}
            />
            <ManInput
              label="설립 예정 자본금 (선택)"
              hint="기본 5,000만. 비우면 순자산가액(자산−부채)으로 봅니다. 등록면허세·세감면 자본금 요건에 씁니다."
              value={input.capital ?? 0}
              onChange={(capital) => patch({ capital: capital > 0 ? capital : undefined })}
            />
          </>
        )}

        {step === 2 && (
          <>
            <ManInput
              label="대표 급여 (연, 세전)"
              hint="기본값은 이익의 50%와 7,200만(월 600만) 중 작은 쪽. 직접 고치면 그 값을 씁니다."
              value={input.ownerSalary}
              onChange={setSalary}
            />
            <DividendInput
              value={input.dividendAmount}
              onChange={(dividendAmount) => patch({ dividendAmount })}
              hasFamily={input.familyWorkers > 0}
            />
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                가족 근무자 수
                <select
                  className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                  value={input.familyWorkers}
                  onChange={(e) => patch({ familyWorkers: Number(e.target.value) })}
                >
                  <option value={0}>없음</option>
                  <option value={1}>1명</option>
                  <option value={2}>2명</option>
                </select>
              </label>
              <ManInput
                label="가족 1인당 연급여"
                hint="기본 3,600만."
                value={input.familySalaryEach}
                onChange={(familySalaryEach) => patch({ familySalaryEach })}
              />
            </div>
            {input.familyWorkers > 0 && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={input.familyLivesSeparately}
                    onChange={(e) => patch({ familyLivesSeparately: e.target.checked })}
                  />
                  가족이 대표와 따로 삽니다 (고용보험·산재보험 반영)
                </label>
                <p className="text-xs leading-relaxed text-warn">
                  가족에게 주는 급여는 실제로 일한 사실(출근, 맡은 업무, 근무시간)을 증명할 수 있어야 합니다. 일한 실체가 없으면 회사 비용으로 인정받지 못하고 대표가 받은 급여로 보아 세금이 붙습니다.
                </p>
              </>
            )}
            <ManInput
              label="성실신고확인비용 (직접 입력)"
              hint="비우면 성실신고 대상일 때 전제값 150만(수정 가능)을 씁니다. 대상이 아니면 0으로 봅니다."
              value={input.sincereFilingConfirmCost}
              onChange={(sincereFilingConfirmCost) => patch({ sincereFilingConfirmCost })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.yellowUmbrellaEnabled}
                onChange={(e) => patch({ yellowUmbrellaEnabled: e.target.checked })}
              />
              노란우산공제 가입 (개인 유지 쪽 소득공제)
            </label>
            {input.yellowUmbrellaEnabled && (
              <>
                <ManInput
                  label="노란우산 연 납입액"
                  hint={`비우면 구간 한도 ${(yellowUmbrellaCap(input.accountingProfit + input.taxAdjustment) / 10_000).toLocaleString("ko-KR")}만 원을 가득 넣는 것으로 봅니다. 연 1,800만 초과분은 공제 안 됨.`}
                  value={input.yellowUmbrellaContribution ?? 0}
                  onChange={(v) => patch({ yellowUmbrellaContribution: v > 0 ? v : undefined })}
                />
                {input.ownerSalary <= YELLOW_UMBRELLA_CORP_SALARY_LIMIT.value && (
                  <p className="text-xs leading-relaxed text-muted">
                    대표 급여가 연 8,000만 원 이하이면 법인에서도 같은 공제를 받을 수 있습니다. 법인 쪽 계산은 아직 넣지 않았습니다(세무사 감수 후 반영).
                  </p>
                )}
              </>
            )}
            <ManInput
              label="타소득 (종합합산)"
              value={input.personalContext.otherIncome}
              onChange={(otherIncome) =>
                patch({ personalContext: { ...input.personalContext, otherIncome } })
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.voluntaryEmploymentIns}
                onChange={(e) => patch({ voluntaryEmploymentIns: e.target.checked })}
              />
              고용보험 임의가입 (요율 없어 금액 미계산)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.voluntaryWorkersComp}
                onChange={(e) => patch({ voluntaryWorkersComp: e.target.checked })}
              />
              산재 임의가입 (요율 없어 금액 미계산)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.retirementPlan}
                onChange={(e) => patch({ retirementPlan: e.target.checked })}
              />
              퇴직급여 설정 예정 (남겨둔 이익을 꺼낼 때 세금을 배당·퇴직 중 낮은 쪽으로 추정)
            </label>
            {input.retirementPlan && (
              <label className="block text-sm">
                정관 퇴직급여 배수
                <span className="mt-0.5 block text-xs text-muted">
                  회사 규정(정관)에 적는 배수. 3배는 2배 초과분이 대표에게 근로소득으로 과세됩니다.
                </span>
                <select
                  className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                  value={input.retirementMultiple}
                  onChange={(e) => patch({ retirementMultiple: Number(e.target.value) as 1 | 2 | 3 })}
                >
                  <option value={1}>1배</option>
                  <option value={2}>2배 (기본)</option>
                  <option value={3}>3배</option>
                </select>
              </label>
            )}
            <p className="text-xs text-muted">
              지역건보 재산은 점수표가 없어 반영하지 않습니다. 실제 부담은 이보다 클 수 있습니다.
            </p>
          </>
        )}

        <div className="flex gap-4 pt-2 text-sm">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="text-muted">
              이전
            </button>
          )}
          {step < 2 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="border border-ink px-3 py-1.5 hover:bg-ink hover:text-canvas"
            >
              다음
            </button>
          )}
        </div>
      </form>

      <div className="no-print mt-10 flex flex-wrap items-center gap-4">
        <ShareButton />
        <Link
          href={`/tools/corp-conversion/report?s=${encoded}`}
          className="text-sm underline underline-offset-4"
        >
          검토보고서
        </Link>
      </div>

      {!input.personalContext.propertyForHealthIns && (
        <p className="mt-8 text-sm text-warn">재산 미반영 — 실제 부담은 이보다 클 수 있음</p>
      )}

      <SummaryCard input={input} indiv={indiv} corp={corp} includeFamily={includeFamily && input.familyWorkers > 0} />
      <ResultCompare
        input={input}
        indiv={indiv}
        corp={corp}
        axis={axis}
        onAxis={setAxis}
        onSalary={setSalary}
        onDividend={(dividendAmount) => patch({ dividendAmount })}
        includeFamily={includeFamily && input.familyWorkers > 0}
        onIncludeFamily={setIncludeFamily}
      />
      <TimingPanel input={input} />
      <MethodPanel input={input} />
      <AssumptionsPanel
        value={input.overrides ?? {}}
        onChange={(overrides: Partial<Assumptions>) => patch({ overrides })}
      />
    </main>
  );
}
