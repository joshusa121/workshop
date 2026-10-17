"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeCompIncome } from "@/lib/tax/comp-income/engine";
import { DEFAULT_COMP_INCOME, normalizeCompIncome, type CompIncomeInput } from "@/lib/tax/comp-income/input";
import { decodeCompIncome, encodeCompIncome } from "@/lib/tax/comp-income/share";
import { Check, CountInput, ManInput } from "./fields";
import { CompIncomeResult } from "./CompIncomeResult";

const SAMPLE_FREELANCER: CompIncomeInput = normalizeCompIncome({
  revenue: 90_000_000,
  expenses: 22_000_000,
  grossSalary: 0,
  spouse: true,
  dependents: 1,
  children8Plus: 1,
  npsPaid: 4_000_000,
  yellowUmbrellaPaid: 3_000_000,
});

const SAMPLE_SIDE_JOB: CompIncomeInput = normalizeCompIncome({
  revenue: 45_000_000,
  expenses: 12_000_000,
  grossSalary: 42_000_000,
  spouse: false,
  dependents: 0,
});

export function CompIncomeCalculator() {
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    if (!s) return { input: DEFAULT_COMP_INCOME, ratesChanged: false, linkError: null as string | null };
    const d = decodeCompIncome(s);
    return d.ok
      ? { input: d.input, ratesChanged: d.ratesChanged, linkError: null as string | null }
      : { input: DEFAULT_COMP_INCOME, ratesChanged: false, linkError: d.reason as string | null };
  });
  const [input, setInput] = useState<CompIncomeInput>(initial.input);
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<CompIncomeInput>) => setInput((prev) => normalizeCompIncome({ ...prev, ...patch }));

  useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("s", encodeCompIncome(input));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, searchParams]);

  const result = useMemo(() => computeCompIncome(input), [input]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">04 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">종합소득세 예상 계산기</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        프리랜서·개인사업자가 5월에 낼 세금(또는 돌려받을 돈)을 미리 계산합니다. 사업소득에 근로소득을 더한 겸업, 가족
        인적공제, 노란우산·연금계좌, 성실신고까지 반영하고 이미 원천징수된 3.3%를 빼서 최종 차액을 보여줍니다.
      </p>

      {initial.ratesChanged && (
        <p className="mt-6 border border-warn px-3 py-2 text-sm text-warn">세법 개정으로 결과가 달라질 수 있습니다.</p>
      )}
      {initial.linkError && (
        <p className="mt-6 border border-accent px-3 py-2 text-sm text-accent">
          {initial.linkError === "만료된 형식"
            ? "예전 형식의 링크라 입력값을 불러오지 못했습니다. 값을 다시 넣거나 새 링크를 받아 주세요."
            : "링크가 잘려 입력값을 불러오지 못했습니다. 링크 전체를 다시 복사하거나 값을 새로 넣어 주세요."}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <fieldset className="space-y-3">
              <legend className="text-sm text-muted">사업소득 (프리랜서·개인사업자)</legend>
              <ManInput label="1년 총수입금액" hint="세금계산서·현금 등 받은 돈 전부 (부가세 제외)" value={input.revenue} onChange={(v) => update({ revenue: v })} />
              <ManInput label="1년 필요경비" hint="실제로 쓴 통상적인 비용 합계" value={input.expenses} onChange={(v) => update({ expenses: v })} />
            </fieldset>

            <fieldset className="space-y-3 border-t border-line pt-6">
              <legend className="text-sm text-muted">근로소득 (겸업 시)</legend>
              <ManInput label="1년 총급여" hint="회사에서 받은 급여가 있으면 입력. 없으면 비워 두세요" value={input.grossSalary} onChange={(v) => update({ grossSalary: v })} />
            </fieldset>

            <fieldset className="space-y-3 border-t border-line pt-6">
              <legend className="text-sm text-muted">가족 (인적공제)</legend>
              <Check checked={input.spouse} onChange={(v) => update({ spouse: v })}>배우자 있음</Check>
              <CountInput label="부양가족 수" hint="부모(60세↑)·자녀(20세↓) 등, 본인·배우자 제외" value={input.dependents} onChange={(v) => update({ dependents: v })} />
              <CountInput label="그중 경로우대(70세↑)" hint="추가공제 100만원/명" value={input.elderly} onChange={(v) => update({ elderly: v })} />
              <CountInput label="그중 장애인" hint="추가공제 200만원/명" value={input.disabled} onChange={(v) => update({ disabled: v })} />
              <Check checked={input.femaleHead} onChange={(v) => update({ femaleHead: v })} hint="부녀자 추가공제 50만원">
                부녀자(배우자 없이 세대주 등)
              </Check>
              <Check checked={input.singleParent} onChange={(v) => update({ singleParent: v })} hint="부녀자와 중복 시 한부모만 적용">
                한부모 (부양 자녀 있음)
              </Check>
              <CountInput label="자녀 8세 이상" hint="자녀세액공제 대상" value={input.children8Plus} onChange={(v) => update({ children8Plus: v })} />
            </fieldset>

            <fieldset className="space-y-3 border-t border-line pt-6">
              <legend className="text-sm text-muted">공제 (소득공제·세액공제)</legend>
              <ManInput label="국민연금 납입액" hint="본인부담분 (소득공제)" value={input.npsPaid} onChange={(v) => update({ npsPaid: v })} />
              <ManInput label="노란우산공제 납입액" hint="사업소득금액 구간별 한도 내 (소득공제)" value={input.yellowUmbrellaPaid} onChange={(v) => update({ yellowUmbrellaPaid: v })} />
              <ManInput label="연금계좌 납입액" hint="연금저축·IRP (세액공제, 연 900만 한도)" value={input.pensionAccountPaid} onChange={(v) => update({ pensionAccountPaid: v })} />
              <Check checked={input.sincereApplies} onChange={(v) => update({ sincereApplies: v })}>성실신고확인 대상 (확인비용 세액공제)</Check>
              {input.sincereApplies && (
                <ManInput label="성실신고 확인비용" value={input.sincereConfirmCost} onChange={(v) => update({ sincereConfirmCost: v })} />
              )}
            </fieldset>

            <fieldset className="space-y-2 border-t border-line pt-6">
              <legend className="text-sm text-muted">기납부세액</legend>
              <Check
                checked={input.prepaidWithholding === null}
                onChange={(v) => update({ prepaidWithholding: v ? null : 0 })}
                hint="사업수입 × 3.3%(3% 국세 + 0.3% 지방소득세)로 자동 계산"
              >
                원천징수 3.3% 자동 반영
              </Check>
              {input.prepaidWithholding !== null && (
                <ManInput
                  label="기납부 원천징수세액 (국세+지방 합계)"
                  value={input.prepaidWithholding}
                  onChange={(v) => update({ prepaidWithholding: v })}
                />
              )}
            </fieldset>
          </form>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <button type="button" onClick={() => setInput(SAMPLE_FREELANCER)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 외주 프리랜서
            </button>
            <button type="button" onClick={() => setInput(SAMPLE_SIDE_JOB)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 직장인 부업
            </button>
            <button type="button" onClick={copyLink} className="text-muted underline underline-offset-4 hover:text-ink">
              {copied ? "링크 복사됨" : "입력값 포함 링크 복사"}
            </button>
          </div>
        </div>

        <div aria-live="polite">
          <CompIncomeResult input={input} result={result} />
        </div>
      </div>
    </main>
  );
}
