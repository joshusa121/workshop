"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeRental } from "@/lib/tax/rental-entity/engine";
import { DEFAULT_INPUT, validateInput, type RentalInput } from "@/lib/tax/rental-entity/input";
import { decodeRental, encodeRental } from "@/lib/tax/rental-entity/share";
import { RentalResult } from "./RentalResult";

const MONEY_FIELDS = [
  ["revenue", "연 임대 총수입", "과세되는 임대료와 별도 산정한 간주임대료를 합한 금액"],
  ["expenses", "연 필요경비", "임대 운영에 들어간 비용 중 세법상 인정되는 금액"],
  ["otherIncome", "다른 종합소득금액", "임대·이자·배당을 제외한 소득공제 전 금액. 근로소득은 총급여가 아닌 근로소득금액"],
  ["otherFinancial", "다른 이자·배당 총액", "이 법인 배당을 제외한, 국내 일반 세율로 원천징수된 세전 금융소득"],
] as const;

export function RentalCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => {
    const s = params.get("s");
    return s ? decodeRental(s) : null;
  });
  const [input, setInput] = useState<RentalInput>(initial?.ok ? initial.input : DEFAULT_INPUT);
  const [copyMessage, setCopyMessage] = useState("");
  const errors = validateInput(input);
  const encoded = errors.length ? null : encodeRental(input);
  const result = useMemo(() => validateInput(input).length ? null : computeRental(input), [input]);
  useEffect(() => {
    if (!encoded) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("s") === encoded) return;
    url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url);
  }, [encoded]);
  const set = <K extends keyof RentalInput>(key: K, value: RentalInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }));
    setCopyMessage("");
  };
  async function copyLink() {
    if (!encoded) return;
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    try { await navigator.clipboard.writeText(url.toString()); setCopyMessage("현재 입력값의 링크를 복사했습니다."); }
    catch { setCopyMessage("복사하지 못했습니다. 주소창의 링크를 직접 복사해 주세요."); }
  }
  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <p className="text-xs tracking-[0.18em] text-muted">10 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">부동산 임대 개인 vs 법인</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">같은 임대수입을 개인으로 받을 때와 법인으로 받아 배당할 때, 올해 세금이 어떻게 달라지는지 비교합니다. 배당하지 않은 돈은 법인 안에 남으며, 꺼내 쓸 때의 미래 세금은 별도입니다.</p>
    {initial && !initial.ok && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">{initial.reason} — {LINK_ERROR_NEXT} 아래는 가상 예시입니다.</p>}
    {initial?.ok && initial.ratesChanged && <p role="status" className="mt-6 border border-warn p-3 text-sm text-warn">세율 버전이 달라 최신 버전으로 다시 계산했습니다.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <h2 className="border-b border-ink pb-3 text-xl">임대와 배당 입력</h2>
        {!initial?.ok && <p className="mt-3 text-xs text-muted">가상 예시가 입력되어 있습니다. 실제 검토할 금액으로 바꿔 주세요.</p>}
        <form className="mt-5 space-y-5" onSubmit={e => e.preventDefault()}>
          <label className="block text-sm">임대 유형
            <select value={input.kind} onChange={e => setInput(prev => ({ ...prev, kind: e.target.value as RentalInput["kind"], registered: false }))} className="mt-2 w-full border border-line bg-paper px-3 py-2">
              <option value="housing">과세대상 주택 임대</option><option value="commercial">상가 등 주택 외 임대</option>
            </select>
          </label>
          {MONEY_FIELDS.map(([key, label, hint]) => <label key={key} className="block text-sm" htmlFor={key}>
            {label} <span className="text-xs text-muted">(원/년)</span>
            <input id={key} type="number" inputMode="numeric" min="0" max="1000000000000" step="1" value={Number.isFinite(input[key]) ? input[key] : ""} onChange={e => set(key, e.target.value === "" ? NaN : Number(e.target.value))} aria-describedby={`${key}-hint`} className="num mt-2 w-full border border-line bg-paper px-3 py-2 focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink" />
            <span id={`${key}-hint`} className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>
          </label>)}
          {input.kind === "housing" && <label className="flex items-start gap-2 text-sm leading-relaxed"><input className="mt-1" type="checkbox" checked={input.registered} onChange={e => set("registered", e.target.checked)} /><span>전 기간·모든 주택이 등록임대주택 특례 요건을 충족합니다<span className="mt-1 block text-xs text-muted">지자체·세무서 등록, 임대료 증액 제한 등 소득세법 시행령 제122조의2 요건을 확인한 경우만 선택. 등록만으로 자동 적용되지 않습니다. Josh 감수 필요.</span></span></label>}
          <label className="flex items-start gap-2 text-sm leading-relaxed"><input className="mt-1" type="checkbox" checked={input.smallCorp} onChange={e => set("smallCorp", e.target.checked)} /><span>소규모 임대 등 법인 요건에 해당합니다<span className="mt-1 block text-xs text-muted">지배주주 등 지분이 절반 초과, 임대업 주업 또는 임대·이자·배당 비중 절반 이상, 상시근로자 다섯 명 미만 요건을 모두 충족하는 경우. 법인세법 제60조의2 제1항 제1호·시행령 제42조·제97조의4. 적격 판단은 Josh 감수 필요.</span></span></label>
          <label className="block text-sm" htmlFor="dividendPercent">세후 법인이익 중 배당할 비율 (%)
            <input id="dividendPercent" type="number" min="0" max="100" step="1" value={Number.isFinite(input.dividendPercent) ? input.dividendPercent : ""} onChange={e => set("dividendPercent", e.target.value === "" ? NaN : Number(e.target.value))} className="num mt-2 w-full border border-line bg-paper px-3 py-2" />
            <span className="mt-1 block text-xs text-muted">배당하지 않은 금액은 법인에 유보합니다. 대표 급여는 반영하지 않습니다.</span>
          </label>
          {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-warn">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
        </form>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <button type="button" disabled={!encoded} onClick={copyLink} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas disabled:opacity-50">공유 링크 복사</button>
          {encoded && <Link href={`/tools/rental-entity/report?s=${encoded}`} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</Link>}
        </div>
        <p role="status" className="mt-2 min-h-5 text-xs text-muted">{copyMessage}</p>
      </div>
      <div aria-live="polite">{result ? <RentalResult input={input} result={result} /> : <p className="border-t border-ink pt-5 text-sm text-warn">입력 오류를 고치면 결과를 다시 계산합니다.</p>}</div>
    </div>
  </main>;
}
