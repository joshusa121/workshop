"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeGiftInheritance } from "@/lib/tax/gift-inheritance/engine";
import { DEFAULT_GIFT_INHERITANCE, normalizeGiftInheritance, type GiftInheritanceInput } from "@/lib/tax/gift-inheritance/input";
import type { Beneficiary } from "@/lib/tax/gift-inheritance/rates-gi";
import { decodeGiftInheritance, encodeGiftInheritance } from "@/lib/tax/gift-inheritance/share";
import { Check, CountInput, ManInput, Radio } from "./fields";
import { GiftInheritanceResult } from "./GiftInheritanceResult";

const BENEFICIARIES: { value: Beneficiary; label: string }[] = [
  { value: "child", label: "자녀" },
  { value: "spouse", label: "배우자" },
  { value: "grandchild", label: "손자녀 (세대생략)" },
];

const SAMPLE_SPLIT: GiftInheritanceInput = normalizeGiftInheritance({ assets: 2_000_000_000, beneficiary: "child", tranches: 2, children: 1 });
const SAMPLE_SPOUSE: GiftInheritanceInput = normalizeGiftInheritance({ assets: 1_500_000_000, beneficiary: "spouse", hasSpouse: true, children: 2 });

export function GiftInheritanceCalculator() {
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    if (!s) return { input: DEFAULT_GIFT_INHERITANCE, ratesChanged: false, linkError: null as string | null };
    const d = decodeGiftInheritance(s);
    return d.ok
      ? { input: d.input, ratesChanged: d.ratesChanged, linkError: null as string | null }
      : { input: DEFAULT_GIFT_INHERITANCE, ratesChanged: false, linkError: d.reason as string | null };
  });
  const [input, setInput] = useState<GiftInheritanceInput>(initial.input);
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<GiftInheritanceInput>) => setInput((prev) => normalizeGiftInheritance({ ...prev, ...patch }));

  useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("s", encodeGiftInheritance(input));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, searchParams]);

  const result = useMemo(() => computeGiftInheritance(input), [input]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">07 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">증여 vs 상속 시뮬레이터</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        재산을 <b>지금 증여</b>할 때, <b>사후 상속</b>할 때, 그리고 <b>10년 간격으로 나눠 증여</b>할 때의 세금을 비교합니다.
        공제·세율·세대생략 할증을 상증세법 원문 기준으로 계산합니다.
      </p>

      {initial.ratesChanged && (
        <p className="mt-6 border border-warn px-3 py-2 text-sm text-warn">세법 개정으로 결과가 달라질 수 있습니다.</p>
      )}
      {initial.linkError && (
        <p className="mt-6 border border-accent px-3 py-2 text-sm text-accent">
          {initial.linkError === "만료된 형식" ? "예전 형식의 링크라 입력값을 불러오지 못했습니다." : "링크가 잘려 입력값을 불러오지 못했습니다."}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <ManInput label="옮길 재산 총액" value={input.assets} onChange={(v) => update({ assets: v })} />
            <Radio legend="증여 대상" value={input.beneficiary} options={BENEFICIARIES} onChange={(v) => update({ beneficiary: v })} />
            <div className="space-y-3 border-t border-line pt-6">
              <CountInput label="분할 증여 횟수" hint="10년 간격으로 공제한도(자녀 5천만)만큼 무세 증여" value={input.tranches} max={10} onChange={(v) => update({ tranches: v })} />
            </div>
            <div className="space-y-3 border-t border-line pt-6">
              <Check checked={input.hasSpouse} onChange={(v) => update({ hasSpouse: v })}>상속 시 배우자가 상속받음</Check>
              <CountInput label="자녀 수" hint="상속 인적공제(1인당 5천만)" value={input.children} max={20} onChange={(v) => update({ children: v })} />
            </div>
          </form>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <button type="button" onClick={() => setInput(SAMPLE_SPLIT)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 20억 나눠 증여
            </button>
            <button type="button" onClick={() => setInput(SAMPLE_SPOUSE)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 배우자·자녀 2명
            </button>
            <button type="button" onClick={copyLink} className="text-muted underline underline-offset-4 hover:text-ink">
              {copied ? "링크 복사됨" : "입력값 포함 링크 복사"}
            </button>
          </div>
        </div>

        <div aria-live="polite">
          <GiftInheritanceResult input={input} result={result} />
          <div className="no-print mt-10 border-t border-line pt-6">
            <a
              href={`/tools/gift-inheritance/report?s=${encodeGiftInheritance(input)}`}
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
