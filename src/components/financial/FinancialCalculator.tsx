"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeFinancial } from "@/lib/tax/financial/engine";
import { DEFAULT_FINANCIAL, normalizeFinancial, type FinancialInput } from "@/lib/tax/financial/input";
import type { StockHolder } from "@/lib/tax/financial/rates-fin";
import { decodeFinancial, encodeFinancial } from "@/lib/tax/financial/share";
import { Check, ManInput, Radio } from "./fields";
import { FinancialResult } from "./FinancialResult";

const HOLDERS: { value: StockHolder; label: string }[] = [
  { value: "major", label: "대주주" },
  { value: "minor", label: "대주주 아님" },
];

const SAMPLE_OVER: FinancialInput = normalizeFinancial({ interest: 30_000_000, dividend: 30_000_000, otherIncome: 50_000_000, stockGain: 200_000_000, holder: "major" });
const SAMPLE_STOCK: FinancialInput = normalizeFinancial({ interest: 0, dividend: 0, stockGain: 500_000_000, holder: "major" });

export function FinancialCalculator() {
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    if (!s) return { input: DEFAULT_FINANCIAL, ratesChanged: false, linkError: null as string | null };
    const d = decodeFinancial(s);
    return d.ok
      ? { input: d.input, ratesChanged: d.ratesChanged, linkError: null as string | null }
      : { input: DEFAULT_FINANCIAL, ratesChanged: false, linkError: d.reason as string | null };
  });
  const [input, setInput] = useState<FinancialInput>(initial.input);
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<FinancialInput>) => setInput((prev) => normalizeFinancial({ ...prev, ...patch }));

  useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("s", encodeFinancial(input));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, searchParams]);

  const result = useMemo(() => computeFinancial(input), [input]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">08 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">금융투자 세금 계산기</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        이자·배당이 2천만원을 넘으면 다른 소득과 합쳐 종합과세됩니다. 원천징수로 끝날 때와 비교해 얼마를 더 내는지, 그리고 대주주
        주식 양도세까지 한 번에 계산합니다.
      </p>

      {initial.ratesChanged && <p className="mt-6 border border-warn px-3 py-2 text-sm text-warn">세법 개정으로 결과가 달라질 수 있습니다.</p>}
      {initial.linkError && (
        <p className="mt-6 border border-accent px-3 py-2 text-sm text-accent">
          {initial.linkError === "만료된 형식" ? "예전 형식의 링크라 입력값을 불러오지 못했습니다." : "링크가 잘려 입력값을 불러오지 못했습니다."}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <fieldset className="space-y-3">
              <legend className="text-sm text-muted">금융소득 (연)</legend>
              <ManInput label="이자소득" value={input.interest} onChange={(v) => update({ interest: v })} />
              <ManInput label="배당소득 (국내)" value={input.dividend} onChange={(v) => update({ dividend: v })} />
              <ManInput label="다른 종합소득금액" hint="근로·사업소득 등 (없으면 비워 두세요)" value={input.otherIncome} onChange={(v) => update({ otherIncome: v })} />
              <ManInput label="종합소득공제" hint="본인 기본공제 등 (간편 입력)" value={input.deductions} onChange={(v) => update({ deductions: v })} />
            </fieldset>

            <fieldset className="space-y-3 border-t border-line pt-6">
              <legend className="text-sm text-muted">주식 양도</legend>
              <ManInput label="주식 양도차익" hint="양도가 − 취득가 − 필요경비 (없으면 0)" value={input.stockGain} onChange={(v) => update({ stockGain: v })} />
              <Radio legend="대주주 여부" value={input.holder} options={HOLDERS} onChange={(v) => update({ holder: v })} />
              <Check checked={input.smallCap} onChange={(v) => update({ smallCap: v })}>중소기업 주식</Check>
              <Check checked={input.heldUnder1y} onChange={(v) => update({ heldUnder1y: v })} hint="대주주·중소기업 외 30%">
                1년 미만 보유(대주주)
              </Check>
            </fieldset>
          </form>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <button type="button" onClick={() => setInput(SAMPLE_OVER)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 이자·배당 6천만
            </button>
            <button type="button" onClick={() => setInput(SAMPLE_STOCK)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 대주주 5억 양도
            </button>
            <button type="button" onClick={copyLink} className="text-muted underline underline-offset-4 hover:text-ink">
              {copied ? "링크 복사됨" : "입력값 포함 링크 복사"}
            </button>
          </div>
        </div>

        <div aria-live="polite">
          <FinancialResult input={input} result={result} />
          <div className="no-print mt-10 border-t border-line pt-6">
            <a href={`/tools/financial/report?s=${encodeFinancial(input)}`} className="inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">
              검토보고서 (인쇄·PDF)
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
