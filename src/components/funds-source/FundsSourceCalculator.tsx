"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeFundsSource } from "@/lib/tax/funds-source/engine";
import { DEFAULT_FUNDS_SOURCE, normalizeFundsSource, type FundsSourceInput } from "@/lib/tax/funds-source/input";
import { decodeFundsSource, encodeFundsSource } from "@/lib/tax/funds-source/share";
import { ManInput } from "./fields";
import { FundsSourceResult } from "./FundsSourceResult";

const SAMPLE_HOME: FundsSourceInput = normalizeFundsSource({
  acquisitionValue: 600_000_000,
  provenIncome: 180_000_000,
  provenInheritance: 50_000_000,
  provenDisposal: 120_000_000,
  fundsWithin10y: 350_000_000,
});

const SAMPLE_GAP: FundsSourceInput = normalizeFundsSource({
  acquisitionValue: 900_000_000,
  provenIncome: 200_000_000,
  provenInheritance: 0,
  provenDisposal: 100_000_000,
  fundsWithin10y: 300_000_000,
});

export function FundsSourceCalculator() {
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    if (!s) return { input: DEFAULT_FUNDS_SOURCE, ratesChanged: false, linkError: null as string | null };
    const d = decodeFundsSource(s);
    return d.ok
      ? { input: d.input, ratesChanged: d.ratesChanged, linkError: null as string | null }
      : { input: DEFAULT_FUNDS_SOURCE, ratesChanged: false, linkError: d.reason as string | null };
  });
  const [input, setInput] = useState<FundsSourceInput>(initial.input);
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<FundsSourceInput>) => setInput((prev) => normalizeFundsSource({ ...prev, ...patch }));

  useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("s", encodeFundsSource(input));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, searchParams]);

  const result = useMemo(() => computeFundsSource(input), [input]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">06 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">자금출처 셀프 진단</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        집·땅을 살 때 그 돈이 어디서 왔는지 스스로 점검합니다. 신고·과세로 확인되는 소득·상속·처분대금으로 소명되는 금액과,
        증여로 추정될 수 있는 부족액을 상증세법 기준으로 가려냅니다.
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
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <ManInput
              label="취득재산 가액"
              hint="산 집·땅 등의 취득가액"
              value={input.acquisitionValue}
              onChange={(v) => update({ acquisitionValue: v })}
            />
            <div className="mt-4 space-y-3 border-t border-line pt-6">
              <ManInput label="① 신고·과세받은 소득금액" value={input.provenIncome} onChange={(v) => update({ provenIncome: v })} />
              <ManInput label="② 신고·과세받은 상속·수증재산" value={input.provenInheritance} onChange={(v) => update({ provenInheritance: v })} />
              <ManInput
                label="③ 재산 처분대가·부채부담 금전"
                hint="부동산·주식 처분대금, 대출금으로 취득에 직접 쓴 금액"
                value={input.provenDisposal}
                onChange={(v) => update({ provenDisposal: v })}
              />
            </div>
            <div className="mt-4 border-t border-line pt-6">
              <ManInput
                label="취득일 전 10년 이내 취득자금 합계"
                hint="5천만원 미만이면 소액으로 추정 배제"
                value={input.fundsWithin10y}
                onChange={(v) => update({ fundsWithin10y: v })}
              />
            </div>
          </form>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <button type="button" onClick={() => setInput(SAMPLE_HOME)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 소명 충분
            </button>
            <button type="button" onClick={() => setInput(SAMPLE_GAP)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 부족액 큼
            </button>
            <button type="button" onClick={copyLink} className="text-muted underline underline-offset-4 hover:text-ink">
              {copied ? "링크 복사됨" : "입력값 포함 링크 복사"}
            </button>
          </div>
        </div>

        <div aria-live="polite">
          <FundsSourceResult input={input} result={result} />
          <div className="no-print mt-10 border-t border-line pt-6">
            <a
              href={`/tools/funds-source/report?s=${encodeFundsSource(input)}`}
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
