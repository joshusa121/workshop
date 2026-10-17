"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeRetirement } from "@/lib/tax/retirement/engine";
import { DEFAULT_RETIREMENT, SAMPLE_EMPLOYEE, SAMPLE_EXECUTIVE, validateRetirement, type RetirementInput } from "@/lib/tax/retirement/input";
import { decodeRetirement, encodeRetirement } from "@/lib/tax/retirement/share";
import { RetirementResult } from "./RetirementResult";

function NumberField({ label, value, onChange, unit, note }: { label: string; value: number; onChange: (v: number) => void; unit: string; note?: string }) {
  return <label className="mt-5 block text-sm"><span>{label}</span>
    <span className="mt-2 flex items-baseline gap-2 border-b border-ink pb-2">
      <input type="number" min="0" step="1" value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))} className="num min-w-0 flex-1 bg-transparent text-right text-lg outline-none focus-visible:ring-2 focus-visible:ring-ink" />
      <span className="text-muted">{unit}</span>
    </span>
    {note && <span className="mt-2 block text-xs leading-relaxed text-muted">{note}</span>}
  </label>;
}

export function RetirementCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => {
    const s = params.get("s");
    const decoded = s ? decodeRetirement(s) : null;
    return { input: decoded?.ok ? decoded.input : DEFAULT_RETIREMENT, error: decoded && !decoded.ok ? decoded.reason : null, ratesChanged: decoded?.ok ? decoded.ratesChanged : false };
  });
  const [input, setInput] = useState<RetirementInput>(initial.input);
  const [message, setMessage] = useState("");
  const errors = validateRetirement(input);
  const complete = errors.length === 0;
  const result = complete ? computeRetirement(input) : null;
  const code = complete ? encodeRetirement(input) : "";
  function update(key: keyof RetirementInput, value: number | boolean) {
    setInput((i) => ({ ...i, [key]: value }));
    setMessage("");
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (code) url.searchParams.set("s", code);
      else url.searchParams.delete("s");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [code]);
  async function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("s", code);
    try { await navigator.clipboard.writeText(url.href); setMessage("링크를 복사했습니다."); }
    catch { setMessage("복사하지 못했습니다. 주소창의 링크 전체를 복사해 주세요."); }
  }

  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <p className="text-xs tracking-[0.18em] text-muted">09 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">퇴직소득세 계산기</h1>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">오랫동안 일하고 받은 퇴직금, 세금은 얼마일까요. 근속기간에 따른 공제부터 임원 퇴직금 한도까지 계산 과정을 펼쳐 봅니다.</p>
    {initial.error && <p role="alert" className="mt-6 border border-accent px-4 py-3 text-sm text-accent">{initial.error} — {LINK_ERROR_NEXT}</p>}
    {initial.ratesChanged && <p className="mt-6 border border-warn px-4 py-3 text-sm text-warn">세율 버전이 다른 링크입니다. 현재 버전으로 다시 계산했습니다.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <form onSubmit={(e) => e.preventDefault()}>
          <h2 className="border-t border-ink pt-4 text-lg">퇴직금과 근속기간</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">2026년 귀속 일반 퇴직금을 한 번에 받는 경우입니다. 빈칸이 있으면 계산하지 않습니다.</p>
          <NumberField label="비과세를 제외한 퇴직금" value={input.amount} onChange={(v) => update("amount", v)} unit="원" />
          <NumberField label="전체 근속월수" value={input.serviceMonths} onChange={(v) => update("serviceMonths", v)} unit="개월" note="퇴직급여 산정 제외기간을 뺀 실제 월수입니다. 남은 월 미만은 올려 넣으세요. 세금 계산에서 연 미만도 올립니다." />
          <label className="mt-6 flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={input.isExecutive} onChange={(e) => update("isExecutive", e.target.checked)} className="h-4 w-4 accent-ink" />법인 임원 퇴직금입니다</label>
          {input.isExecutive && <fieldset className="mt-7 border-t border-line pt-4">
            <legend className="px-1 text-sm">임원 퇴직소득 한도</legend>
            <p className="text-xs leading-relaxed text-muted">구간별 월수의 합이 전체 근속월수와 같아야 합니다. 연평균 총급여는 봉급·상여 중 비과세를 제외한 금액의 연간 평균 환산액입니다.</p>
            <NumberField label="2011년 말 이전 근무월수" value={input.monthsBefore2012} onChange={(v) => update("monthsBefore2012", v)} unit="개월" />
            <NumberField label="2012~2019년 근무월수" value={input.months2012To2019} onChange={(v) => update("months2012To2019", v)} unit="개월" />
            <NumberField label="2020년 이후 근무월수" value={input.monthsFrom2020} onChange={(v) => update("monthsFrom2020", v)} unit="개월" />
            <NumberField label="2019년 말 기준 연평균 총급여" value={input.annualSalary2019} onChange={(v) => update("annualSalary2019", v)} unit="원" note="2019년 말부터 소급한 세 해 기준입니다. 해당 구간 근무가 더 짧으면 그 기간으로 환산합니다. 해당 구간이 없으면 0원입니다." />
            <NumberField label="퇴직일 기준 연평균 총급여" value={input.annualSalaryAtRetirement} onChange={(v) => update("annualSalaryAtRetirement", v)} unit="원" note="퇴직일부터 소급한 세 해 기준입니다. 2020년 이후 근무가 더 짧으면 그 기간으로 환산합니다." />
          </fieldset>}
        </form>
        <div className="mt-8 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
          <button type="button" onClick={() => { setInput(SAMPLE_EMPLOYEE); setMessage(""); }} className="underline underline-offset-4">근로자 예시</button>
          <button type="button" onClick={() => { setInput(SAMPLE_EXECUTIVE); setMessage(""); }} className="underline underline-offset-4">임원 예시</button>
          {complete && <button type="button" onClick={copyLink} className="underline underline-offset-4">입력값 포함 링크 복사</button>}
        </div>
        <p role="status" className="mt-3 text-xs text-muted">{message}</p>
        <p className="mt-4 text-xs leading-relaxed text-muted">공유 링크에는 입력한 금액과 기간이 담깁니다.</p>
      </div>
      <div aria-live="polite">
        {result ? <><RetirementResult input={input} result={result} /><a href={`/tools/retirement/report?s=${code}`} className="no-print mt-10 inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a></> :
          <div className="border-t border-ink pt-6 text-sm leading-relaxed text-muted"><p>퇴직금과 근속월수를 넣으면 공제와 세금이 나옵니다. 예시로 먼저 확인할 수도 있습니다.</p><ul className="mt-4 list-disc space-y-2 pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>}
      </div>
    </div>
  </main>;
}
