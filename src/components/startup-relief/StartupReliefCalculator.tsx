"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeStartupRelief } from "@/lib/tax/startup-relief/engine";
import { DEFAULT_STARTUP_RELIEF, INDUSTRIES, REGIONS, SAMPLE_STARTUP_RELIEF, STARTUP_KINDS, inputErrors, type StartupReliefInput } from "@/lib/tax/startup-relief/input";
import { LOW_REVENUE, STARTUP_BASIS, STARTUP_SUNSET } from "@/lib/tax/startup-relief/rates-startup";
import { decodeStartupRelief, encodeStartupRelief } from "@/lib/tax/startup-relief/share";
import type { Basis } from "@/lib/tax/sources";
import { StartupReliefResult } from "./StartupReliefResult";

const fieldClass = "mt-2 w-full min-w-0 border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block text-sm"><span>{label}</span>{hint && <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>}{children}</label>;
}
function Source({ basis }: { basis: Basis }) {
  return basis.kind === "law" ? <details className="mt-2 text-xs leading-relaxed text-muted"><summary className="cursor-pointer underline underline-offset-2">요건과 근거 확인</summary><p className="mt-2">{basis.appliesTo}</p><a href={basis.url} target="_blank" rel="noreferrer" className="mt-1 block underline">{basis.law} {basis.article} · 확인 {basis.confirmedAt}</a></details> : null;
}
export function StartupReliefCalculator() {
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const s = searchParams.get("s");
    const d = s ? decodeStartupRelief(s) : null;
    return d?.ok ? { input: d.input, ratesChanged: d.ratesChanged, error: null as string | null }
      : { input: DEFAULT_STARTUP_RELIEF, ratesChanged: false, error: d && !d.ok ? d.reason : null };
  });
  const [input, setInput] = useState(initial.input);
  const [copyStatus, setCopyStatus] = useState("");
  const update = (p: Partial<StartupReliefInput>) => { setInput(prev => ({ ...prev, ...p })); setCopyStatus(""); };
  const result = useMemo(() => computeStartupRelief(input), [input]);
  const canShare = inputErrors(input).length === 0;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString());
      if (canShare) p.set("s", encodeStartupRelief(input)); else p.delete("s");
      window.history.replaceState(null, "", `${window.location.pathname}${p.size ? `?${p}` : ""}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [input, canShare, searchParams]);
  async function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("s", encodeStartupRelief(input));
    try { await navigator.clipboard.writeText(url.toString()); setCopyStatus("링크를 복사했습니다"); }
    catch { setCopyStatus("복사하지 못했습니다. 주소창의 URL을 복사해 주세요."); }
  }
  return (
    <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
      <p className="text-xs tracking-[0.18em] text-muted">12 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">창업중소기업 감면 판정</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">어디서, 어떤 사업을 시작했는지에 따라 국세를 줄여주는 제도입니다. 창업 요건과 감면기간을 확인하고, 감면 대상 사업의 세액에서 얼마나 줄어드는지 계산합니다.</p>
      <p className="mt-3 text-xs text-muted">일반 창업 감면 · 창업일 {"2025-01-01"}~{STARTUP_SUNSET.value} · 확인되지 않은 사실은 Josh 감수</p>
      {initial.error && <p role="alert" className="mt-6 border border-accent p-3 text-sm text-accent">{initial.error} — {LINK_ERROR_NEXT}</p>}
      {initial.ratesChanged && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">저장 후 세법 버전이 바뀌었습니다. 현재 기준으로 다시 계산했습니다.</p>}
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="no-print min-w-0 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <form className="space-y-7" onSubmit={e => e.preventDefault()}>
            <fieldset className="space-y-4 border-t border-ink pt-4">
              <legend className="pr-3 text-lg">창업의 요건</legend>
              <Field label="창업일" hint="사업을 실제로 시작한 날입니다."><input type="date" value={input.startupDate} onChange={e => update({ startupDate: e.target.value })} className={fieldClass} /></Field>
              <Field label="어떻게 시작했나요?"><select value={input.startupKind} onChange={e => update({ startupKind: e.target.value as StartupReliefInput["startupKind"] })} className={fieldClass}>{Object.entries(STARTUP_KINDS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
              <Source basis={STARTUP_BASIS.startup} />
              <Field label="조세특례제한법상 중소기업인가요?" hint="일반적인 의미의 작은 회사와 다릅니다. 규모·독립성 등을 확인한 뒤 선택하세요."><select value={input.sme} onChange={e => update({ sme: e.target.value as StartupReliefInput["sme"] })} className={fieldClass}><option value="unknown">미확인</option><option value="yes">요건 충족 확인</option><option value="no">미충족</option></select></Field>
              <Source basis={STARTUP_BASIS.sme} />
              <Field label="감면 대상 업종" hint="사업자등록 명칭만으로 확정할 수 없습니다. 실제 영업과 한국표준산업분류를 기준으로 확인합니다."><select value={input.industry} onChange={e => update({ industry: e.target.value as StartupReliefInput["industry"] })} className={fieldClass}>{Object.entries(INDUSTRIES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
              <Source basis={STARTUP_BASIS.industry} />
              <Field label="창업한 지역의 구분" hint="수도권의 과밀억제권역과 인구감소지역은 별도 구분입니다. 주소에 따른 자동 판정은 하지 않습니다."><select value={input.region} onChange={e => update({ region: e.target.value as StartupReliefInput["region"] })} className={fieldClass}>{Object.entries(REGIONS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
              <Source basis={STARTUP_BASIS.rate} />
              <Field label="청년창업 대표자 요건" hint="창업 당시 만 나이와 병역, 법인은 지배주주·최대주주 여부까지 확인한 결과를 선택합니다."><select value={input.youth} onChange={e => update({ youth: e.target.value as StartupReliefInput["youth"] })} className={fieldClass}><option value="unknown">미확인</option><option value="yes">청년 요건 모두 충족 확인</option><option value="no">청년 외 창업</option></select></Field>
              <details className="text-xs leading-relaxed text-muted"><summary className="cursor-pointer underline">청년 요건 풀이</summary><p className="mt-2">창업 당시 만 15세 이상 34세 이하가 기준입니다. 법에서 정한 병역 이행기간은 최대 6년까지 나이에서 뺍니다. 법인은 대표자가 지배주주이면서 최대주주·최대출자자여야 합니다. 공동사업은 손익분배비율이 가장 큰 사업자(동률이면 모두)를 확인합니다. 생일·복무일수 경계와 지분 변동은 Josh 감수 필요입니다.</p><Source basis={STARTUP_BASIS.youth} /></details>
            </fieldset>
            <fieldset className="space-y-4 border-t border-ink pt-4">
              <legend className="pr-3 text-lg">감면기간과 세액</legend>
              <Field label="계산할 과세연도" hint="현재 법령 기준으로 계산합니다. 미래 연도 개정 여부는 Josh 감수 필요입니다."><input type="number" min="2026" step="1" value={input.taxYear || ""} onChange={e => update({ taxYear: Number(e.target.value) })} className={fieldClass} /></Field>
              <Field label="처음 소득이 생긴 과세연도" hint="매출이 아니라 비용 등을 뺀 과세소득이 처음 발생한 연도입니다. 아직 없으면 비워두세요."><input type="number" min="2025" step="1" value={input.firstIncomeYear ?? ""} onChange={e => update({ firstIncomeYear: e.target.value === "" ? null : Number(e.target.value) })} className={fieldClass} /></Field>
              <Source basis={STARTUP_BASIS.period} />
              <Field label="연간으로 환산한 수입금액 (원)" hint="비용을 빼기 전 총수입입니다. 과세기간이 짧으면 연간으로 환산한 금액을 넣으세요."><input type="number" min="0" step="1" value={input.annualRevenue} onChange={e => update({ annualRevenue: Number(e.target.value) })} className={fieldClass} /></Field>
              <Source basis={LOW_REVENUE.basis} />
              <Field label="대상 사업의 국세 산출세액 (원)" hint="감면 대상 사업 소득에 해당하는 소득세 또는 법인세입니다. 다른 소득분·지방세·가산세는 제외합니다. 모르면 세무사와 배분액부터 확인하세요."><input type="number" min="0" step="1" value={input.eligibleTax} onChange={e => update({ eligibleTax: Number(e.target.value) })} className={fieldClass} /></Field>
              <label className="flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" checked={input.specialCase} onChange={e => update({ specialCase: e.target.checked })} className="mt-1 accent-ink" /><span>사업장 이전·지점 설치·지분 변동·특수 감면·연말 외 결산 등 별도 검토할 사유가 있습니다.</span></label>
            </fieldset>
          </form>
          <div className="mt-6 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
            <button type="button" onClick={() => { setInput(SAMPLE_STARTUP_RELIEF); setCopyStatus(""); }} className="underline underline-offset-4 hover:text-accent">예시: 수도권 청년 창업</button>
            <button type="button" onClick={() => { setInput(DEFAULT_STARTUP_RELIEF); setCopyStatus(""); }} className="text-muted underline underline-offset-4">초기화</button>
            {canShare && <button type="button" onClick={copyLink} className="underline underline-offset-4 hover:text-accent">입력값 포함 링크 복사</button>}
            {copyStatus && <p role="status" className="w-full text-xs text-muted">{copyStatus}</p>}
          </div>
        </div>
        <div className="min-w-0" aria-live="polite">
          <StartupReliefResult input={input} result={result} />
          {canShare && <div className="no-print mt-10 border-t border-line pt-6"><a href={`/tools/startup-relief/report?s=${encodeStartupRelief(input)}`} className="inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a></div>}
        </div>
      </div>
    </main>
  );
}
