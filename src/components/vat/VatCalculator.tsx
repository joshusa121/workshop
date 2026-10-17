"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeVat } from "@/lib/tax/vat/engine";
import { DEFAULT_VAT, normalizeVat, type VatInput } from "@/lib/tax/vat/input";
import { INDUSTRY_LABEL, SIMPLE_VALUE_RATE, type VatIndustry } from "@/lib/tax/vat/rates-vat";
import { decodeVat, encodeVat } from "@/lib/tax/vat/share";
import { ManInput, Radio } from "./fields";
import { VatResult } from "./VatResult";

const INDUSTRY_OPTIONS = (Object.keys(SIMPLE_VALUE_RATE.value) as VatIndustry[]).map((key) => ({
  value: key,
  label: INDUSTRY_LABEL[key],
  note: `부가가치율 ${(SIMPLE_VALUE_RATE.value[key] * 100).toFixed(0)}%`,
}));

const SAMPLE_RETAIL: VatInput = normalizeVat({ industry: "retail", annualRevenue: 95_000_000, purchaseWithInvoice: 40_000_000 });
const SAMPLE_MANU: VatInput = normalizeVat({ industry: "manufacturing", annualRevenue: 130_000_000, purchaseWithInvoice: 55_000_000 });

export function VatCalculator() {
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    if (!s) return { input: DEFAULT_VAT, ratesChanged: false, linkError: null as string | null };
    const d = decodeVat(s);
    return d.ok
      ? { input: d.input, ratesChanged: d.ratesChanged, linkError: null as string | null }
      : { input: DEFAULT_VAT, ratesChanged: false, linkError: d.reason as string | null };
  });
  const [input, setInput] = useState<VatInput>(initial.input);
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<VatInput>) => setInput((prev) => normalizeVat({ ...prev, ...patch }));

  useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("s", encodeVat(input));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, searchParams]);

  const result = useMemo(() => computeVat(input), [input]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">05 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">부가가치세 계산기</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        같은 매출·매입을 <b>간이과세</b>로 낼 때와 <b>일반과세</b>로 낼 때의 부가가치세를 나란히 계산합니다. 간이과세를
        선택할 수 있는지(연 매출 1억 400만원 미만), 납부의무가 면제되는지(4,800만원 미만)도 함께 판정합니다.
      </p>

      {initial.ratesChanged && (
        <p className="mt-6 border border-warn px-3 py-2 text-sm text-warn">세법 개정으로 결과가 달라질 수 있습니다.</p>
      )}
      {initial.linkError && (
        <p className="mt-6 border border-accent px-3 py-2 text-sm text-accent">
          {initial.linkError === "만료된 형식"
            ? "예전 형식의 링크라 입력값을 불러오지 못했습니다."
            : "링크가 잘려 입력값을 불러오지 못했습니다."}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <Radio legend="업종 (간이과세 부가가치율)" value={input.industry} options={INDUSTRY_OPTIONS} onChange={(v) => update({ industry: v })} />
            <div className="space-y-3 border-t border-line pt-6">
              <ManInput
                label="1년 매출 (부가세 포함)"
                hint="공급대가 합계 — 직전 연도 기준"
                value={input.annualRevenue}
                onChange={(v) => update({ annualRevenue: v })}
              />
              <ManInput
                label="1년 매입 (세금계산서 받은 금액, 부가세 포함)"
                hint="일반과세는 매입세액, 간이과세는 0.5% 공제로 반영"
                value={input.purchaseWithInvoice}
                onChange={(v) => update({ purchaseWithInvoice: v })}
              />
            </div>
          </form>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <button type="button" onClick={() => setInput(SAMPLE_RETAIL)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 동네 가게
            </button>
            <button type="button" onClick={() => setInput(SAMPLE_MANU)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 1억 넘는 공방
            </button>
            <button type="button" onClick={copyLink} className="text-muted underline underline-offset-4 hover:text-ink">
              {copied ? "링크 복사됨" : "입력값 포함 링크 복사"}
            </button>
          </div>
        </div>

        <div aria-live="polite">
          <VatResult input={input} result={result} />
          <div className="no-print mt-10 border-t border-line pt-6">
            <a
              href={`/tools/vat/report?s=${encodeVat(input)}`}
              className="inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas"
            >
              검토보고서 (인쇄·PDF)
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
