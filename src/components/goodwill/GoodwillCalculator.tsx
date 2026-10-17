"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EMPTY_GOODWILL_INPUT, runGoodwill, type GoodwillInput } from "@/lib/tax/goodwill/net-effect";
import { decodeGoodwill, encodeGoodwill } from "@/lib/tax/goodwill/share";import { GoodwillResult } from "./GoodwillResult";
import { LINK_ERROR_NEXT } from "@/lib/link-error";

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
    <label className="block min-w-0">
      <span className="text-sm">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <span className="mt-1 flex items-baseline gap-2 border-b border-ink">
        <input
          type="number"
          className="num w-full min-w-0 bg-transparent py-2 outline-none"
          value={man === 0 ? "" : man}
          onChange={(e) => onChange((Number(e.target.value) || 0) * 10_000)}
        />
        <span className="text-xs text-muted">만원</span>
      </span>
    </label>
  );
}

const SAMPLE: GoodwillInput = {
  netIncomes: [150_000_000, 120_000_000, 100_000_000],
  equity: 200_000_000,
  otherComprehensiveIncome: 0,
  corpTaxBase: 200_000_000,
  withRealEstate: false,
  discountRate: 0,
};

export function GoodwillCalculator() {
  const searchParams = useSearchParams();
  // 공유 링크(?s=)는 첫 렌더에서 한 번만 읽는다. Suspense 안이라 서버는 fallback을 내고 클라이언트에서만 실행된다.
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    if (!s) return { input: EMPTY_GOODWILL_INPUT, ratesChanged: false, linkError: null as string | null };
    const d = decodeGoodwill(s);
    return d.ok
      ? { input: d.input, ratesChanged: d.ratesChanged, linkError: null as string | null }
      : { input: EMPTY_GOODWILL_INPUT, ratesChanged: false, linkError: d.reason as string | null };
  });
  const [input, setInput] = useState<GoodwillInput>(initial.input);
  const { ratesChanged, linkError } = initial;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("s", encodeGoodwill(input));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, searchParams]);

  const patch = (partial: Partial<GoodwillInput>) => setInput((prev) => ({ ...prev, ...partial }));
  const setYear = (i: 0 | 1 | 2, v: number) => {
    const next = [...input.netIncomes] as [number, number, number];
    next[i] = v;
    patch({ netIncomes: next });
  };
  const result = useMemo(() => runGoodwill(input), [input]);
  const hasInput = input.netIncomes.some((n) => n !== 0) || input.equity !== 0;

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">02 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">영업권 계산기</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        영업권은 단골, 평판, 노하우처럼 장부에는 없지만 돈이 되는 가게의 가치입니다. 개인사업자가 법인으로
        바꾸면서 이 가치를 법인에 파는 경우, 세법이 인정하는 가격은 얼마이고 세금은 어느 쪽에 얼마나
        생기는지 계산합니다.
      </p>

      {ratesChanged && (
        <p className="mt-6 border border-warn px-3 py-2 text-sm text-warn">세법 개정으로 결과가 달라질 수 있습니다.</p>
      )}
      {linkError && (
        <p className="mt-6 border border-accent px-3 py-2 text-sm text-accent">
          {linkError} — {LINK_ERROR_NEXT}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <form className="space-y-5 lg:sticky lg:top-8 lg:self-start" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="space-y-3">
            <legend className="text-sm">
              최근 3년 순이익 (세금 내기 전 사업소득)
              <span className="mt-0.5 block text-xs text-muted">가장 최근 해부터. 손실이면 마이너스로.</span>
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <ManInput label="직전 1년" value={input.netIncomes[0]} onChange={(v) => setYear(0, v)} />
              <ManInput label="직전 2년" value={input.netIncomes[1]} onChange={(v) => setYear(1, v)} />
              <ManInput label="직전 3년" value={input.netIncomes[2]} onChange={(v) => setYear(2, v)} />
            </div>
          </fieldset>
          <ManInput
            label="자기자본 (자산 − 부채)"
            hint="전환 시점 재무상태표의 순자산."
            value={input.equity}
            onChange={(equity) => patch({ equity })}
          />
          <ManInput
            label="대표의 다른 소득 (연간)"
            hint="영업권 대금 외에 같은 해에 합산되는 사업·근로소득. 없으면 비워 둡니다."
            value={input.otherComprehensiveIncome}
            onChange={(otherComprehensiveIncome) => patch({ otherComprehensiveIncome })}
          />
          <ManInput
            label="법인의 예상 이익 (세금을 매기는 기준 금액)"
            hint="영업권 비용을 빼기 전, 법인이 해마다 세금을 매기는 기준으로 삼을 이익입니다."
            value={input.corpTaxBase}
            onChange={(corpTaxBase) => patch({ corpTaxBase })}
          />
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={input.withRealEstate}
              onChange={(e) => patch({ withRealEstate: e.target.checked })}
            />
            <span>
              사업장 부동산(토지·건물)을 영업권과 함께 법인에 넘깁니다
              <span className="mt-0.5 block text-xs text-muted">체크하면 이 계산기 범위를 벗어납니다.</span>
            </span>
          </label>
          <label className="block text-sm">
            법인 절세액 할인율 {Math.round((input.discountRate ?? 0) * 100)}%
            <span className="mt-0.5 block text-xs text-muted">5년에 걸쳐 아끼는 세금을 오늘 가치로 볼 때. 0%면 단순 합계.</span>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={Math.round((input.discountRate ?? 0) * 100)}
              onChange={(e) => patch({ discountRate: Number(e.target.value) / 100 })}
              className="mt-2 w-full accent-accent"
            />
          </label>
          <div className="no-print flex flex-wrap gap-4 pt-2 text-sm">
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="border border-ink px-3 py-1.5 hover:bg-ink hover:text-canvas"
            >
              예시 값 넣기
            </button>
            <button type="button" onClick={copyLink} className="text-muted underline underline-offset-4">
              {copied ? "링크 복사됨" : "입력값 포함 링크 복사"}
            </button>
          </div>
        </form>

        <div>
          {hasInput ? (
            <>
              <GoodwillResult input={input} result={result} />
              <div className="no-print mt-10 border-t border-line pt-6">
                <a
                  href={`/tools/goodwill/report?s=${encodeGoodwill(input)}`}
                  className="inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas"
                >
                  검토보고서 (인쇄·PDF)
                </a>
              </div>
            </>
          ) : (
            <p className="border-t border-ink pt-6 text-sm leading-relaxed text-muted">
              왼쪽에 최근 3년 순이익과 자기자본을 넣으면 평가액부터 순효과까지 차례로 나옵니다. 감이 안 오면
              「예시 값 넣기」로 시작합니다.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
