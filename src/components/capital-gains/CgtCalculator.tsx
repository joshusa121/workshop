"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeCgt } from "@/lib/tax/cgt/cgt";
import { EMPTY_CGT_INPUT, isComplete, missingFields, SAMPLE_SURCHARGE, SAMPLE_TEMPORARY } from "@/lib/tax/cgt/defaults";
import type { CgtInput } from "@/lib/tax/cgt/input";
import { decodeCgt, encodeCgt } from "@/lib/tax/cgt/share";
import { CgtResult } from "./CgtResult";
import { StepHousehold, StepRedevelopment, StepSubject } from "./steps";

const STEPS = ["팔 집", "세대가 가진 다른 집", "재건축·재개발"] as const;

export function CgtCalculator() {
  const searchParams = useSearchParams();
  // 공유 링크(?s=)는 첫 렌더에서 한 번만 읽는다. Suspense 안이라 클라이언트에서만 실행된다.
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    if (!s) return { input: EMPTY_CGT_INPUT, ratesChanged: false, linkError: null as string | null };
    const d = decodeCgt(s);
    return d.ok
      ? { input: d.input, ratesChanged: d.ratesChanged, linkError: null as string | null }
      : { input: EMPTY_CGT_INPUT, ratesChanged: false, linkError: d.reason as string | null };
  });
  const [input, setInput] = useState<CgtInput>(initial.input);
  const [step, setStep] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const complete = isComplete(input);

  useEffect(() => {
    if (!complete) return;
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("s", encodeCgt(input));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, complete, searchParams]);

  const result = useMemo(() => (complete ? computeCgt(input) : null), [input, complete]);
  const missing = missingFields(input);

  function loadSample(sample: CgtInput) {
    setInput(sample);
    setFormKey((k) => k + 1);
    setCopied(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">03 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">주택 양도세 계산기</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        집을 팔 때 세금이 없는지(비과세), 있다면 얼마인지, 여러 채라서 더 무거워지는지(중과)를 날짜와 근거 조문으로
        판정합니다. 1세대 1주택부터 일시적 2주택, 입주권·분양권, 재건축까지 다룹니다.
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
          <ol className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {STEPS.map((label, i) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                  className={i === step ? "border-b border-ink" : "text-muted hover:text-ink"}
                >
                  {i + 1} {label}
                </button>
              </li>
            ))}
          </ol>

          <form key={formKey} className="mt-6" onSubmit={(e) => e.preventDefault()}>
            {step === 0 && <StepSubject input={input} update={setInput} />}
            {step === 1 && <StepHousehold input={input} update={setInput} />}
            {step === 2 && <StepRedevelopment input={input} update={setInput} />}
          </form>

          <div className="mt-8 flex items-baseline justify-between text-sm">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="text-muted hover:text-ink">
                이전
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 && (
              <button type="button" onClick={() => setStep(step + 1)} className="border border-ink px-3 py-1.5 hover:bg-ink hover:text-canvas">
                다음: {STEPS[step + 1]}
              </button>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <button type="button" onClick={() => loadSample(SAMPLE_TEMPORARY)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 이사하며 두 채
            </button>
            <button type="button" onClick={() => loadSample(SAMPLE_SURCHARGE)} className="text-muted underline underline-offset-4 hover:text-ink">
              예시: 조정지역 두 채
            </button>
            {complete && (
              <button type="button" onClick={copyLink} className="text-muted underline underline-offset-4 hover:text-ink">
                {copied ? "링크 복사됨" : "입력값 포함 링크 복사"}
              </button>
            )}
          </div>
        </div>

        <div aria-live="polite">
          {result ? (
            <>
              <CgtResult input={input} result={result} />
              <div className="no-print mt-10 border-t border-line pt-6">
                <a
                  href={`/tools/capital-gains/report?s=${encodeCgt(input)}`}
                  className="inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas"
                >
                  검토보고서 (인쇄·PDF)
                </a>
              </div>
            </>
          ) : (
            <div className="border-t border-ink pt-6 text-sm leading-relaxed text-muted">
              <p>
                왼쪽에 {missing.filter((m) => !m.includes("앞섭니다")).join(", ")}을 넣으면 판정과 세금이 바로 나옵니다.
              </p>
              {missing.some((m) => m.includes("앞섭니다")) && <p className="mt-2 text-accent">판 날이 산 날보다 앞섭니다. 날짜를 확인해 주세요.</p>}
              <p className="mt-4">감이 안 오면 예시로 시작해 보세요.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => loadSample(SAMPLE_TEMPORARY)} className="border border-ink px-3 py-1.5 text-ink hover:bg-ink hover:text-canvas">
                  이사하며 두 채가 된 경우
                </button>
                <button type="button" onClick={() => loadSample(SAMPLE_SURCHARGE)} className="border border-ink px-3 py-1.5 text-ink hover:bg-ink hover:text-canvas">
                  조정지역에 두 채인 경우
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
