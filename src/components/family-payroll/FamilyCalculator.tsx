"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeFamilyPayroll } from "@/lib/tax/family-payroll/engine";
import { DEFAULT_FAMILY_INPUT, SAMPLE_FAMILY_INPUT, familyInputErrors, type FamilyPayrollInput, type Check } from "@/lib/tax/family-payroll/input";
import { decodeFamilyPayroll, encodeFamilyPayroll } from "@/lib/tax/family-payroll/share";
import { FamilyResult } from "./FamilyResult";

const fieldClass = "mt-2 w-full border border-line bg-paper px-3 py-2 text-base focus:border-ink focus:outline-2 focus:outline-ink";
function MoneyField({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return <label className="block text-sm">{label}<input type="number" min={0} max={1_000_000_000_000} step={1} value={Number.isNaN(value) ? "" : value} onChange={e => onChange(e.target.value === "" ? NaN : e.target.valueAsNumber)} className={`${fieldClass} num`} />{hint && <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>}</label>;
}
function CheckField({ label, value, onChange }: { label: string; value: Check; onChange: (n: Check) => void }) {
  return <label className="block text-sm">{label}<select value={value} onChange={e => onChange(e.target.value as Check)} className={fieldClass}><option value="unknown">아직 확인하지 못함</option><option value="yes">확인했음</option><option value="no">충족하지 않음</option></select></label>;
}
export function FamilyCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => {
    const s = params.get("s"); const d = s !== null ? decodeFamilyPayroll(s) : null;
    return { input: d?.ok ? d.input : DEFAULT_FAMILY_INPUT, error: d && !d.ok ? d.reason : null, changed: d?.ok ? d.ratesChanged : false };
  });
  const [input, setInput] = useState<FamilyPayrollInput>(initial.input);
  const [message, setMessage] = useState("");
  const errors = familyInputErrors(input);
  const result = useMemo(() => familyInputErrors(input).length ? null : computeFamilyPayroll(input), [input]);
  const encoded = result ? encodeFamilyPayroll(input) : null;
  const set = <K extends keyof FamilyPayrollInput>(key: K, value: FamilyPayrollInput[K]) => { setInput(p => ({ ...p, [key]: value })); setMessage(""); };
  async function copyLink() {
    if (!encoded) return;
    const url = new URL(window.location.href); url.search = ""; url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url);
    try { await navigator.clipboard.writeText(url.href); setMessage("입력값을 포함한 링크를 복사했습니다."); }
    catch { setMessage("주소창에 입력값을 담았습니다. 주소를 직접 복사해 주세요."); }
  }
  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <p className="text-xs tracking-[0.18em] text-muted">18 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">가족 고용 절세 판정</h1>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">가족에게 월급을 주면 세금이 줄어들까요? 실제 근무와 비용 인정 요건부터 살펴보고, 사업주 세금 감소에서 가족의 보험료와 근로소득세를 뺀 가계의 변화를 비교합니다.</p>
    <p className="mt-3 text-sm text-muted">개인사업자 장부 신고 · 이 급여만 있는 배우자·자녀 · 연간 금액 입력</p>
    {initial.error && <p role="alert" className="mt-6 border border-accent p-3 text-sm text-accent">{initial.error} — {LINK_ERROR_NEXT}</p>}
    {initial.changed && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">세율 버전이 바뀌었습니다. 현재 기준으로 다시 계산했습니다.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print min-w-0 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <form className="space-y-8" onSubmit={e => e.preventDefault()}>
          <fieldset><legend className="text-lg">실제 일을 하는 가족인가요</legend><div className="mt-4 space-y-4">
            <label className="block text-sm">고용할 가족<select value={input.relation} onChange={e => set("relation", e.target.value as FamilyPayrollInput["relation"])} className={fieldClass}><option value="spouse">배우자</option><option value="child">자녀</option></select></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={input.livingTogether} onChange={e => set("livingTogether", e.target.checked)} className="mt-1 accent-accent" />함께 살고 있습니다</label>
            <CheckField label="실제 담당 업무와 근무 시간이 있나요" value={input.actualWork} onChange={n => set("actualWork", n)} />
            <CheckField label="같은 일을 하는 직원에 비춰 급여가 적정한가요" value={input.reasonablePay} onChange={n => set("reasonablePay", n)} />
            <CheckField label="계약서·근무기록·급여 이체 증빙이 있나요" value={input.evidence} onChange={n => set("evidence", n)} />
          </div></fieldset>
          <fieldset><legend className="text-lg">급여와 사업주 소득</legend><div className="mt-4 space-y-4">
            <MoneyField label="고용 전 사업주 연간 과세표준 (원)" value={input.businessTaxBase} onChange={n => set("businessTaxBase", n)} hint="가족 급여와 사업주 부담 보험료를 비용에 넣기 전 금액입니다. 매출이 아닙니다." />
            <MoneyField label="가족의 연간 과세 총급여 (원)" value={input.salary} onChange={n => set("salary", n)} hint="실수령액이 아닌 세전 금액입니다. 비과세 급여는 이 계산에서 제외합니다." />
            <label className="flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" checked={input.wasDependent} onChange={e => set("wasDependent", e.target.checked)} className="mt-1 accent-accent" /><span>사업주가 고용 전 이 가족의 기본공제를 실제로 적용했습니다. 자녀의 나이·생계 등 기존 요건도 확인했습니다.</span></label>
            <label className="flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" checked={input.onlySalary} onChange={e => set("onlySalary", e.target.checked)} className="mt-1 accent-accent" /><span>가족은 이 급여 외 다른 급여·사업·금융소득 등이 없고, 고용 전 본인 부담 보험료도 없었습니다.</span></label>
          </div></fieldset>
          <fieldset><legend className="text-lg">보험은 공단 확인 금액으로</legend><p className="mt-2 text-xs leading-relaxed text-muted">가족 직원 고용으로 새로 부담하는 연간 금액을 입력하세요. 고용·산재 가입 여부를 동거 여부만으로 정하지 않습니다. 적용 제외가 확인된 보험만 해당 부담액을 제외합니다.</p><div className="mt-4 space-y-4">
            <MoneyField label="사업주 부담 보험료 증가액 (원)" value={input.employerPremium} onChange={n => set("employerPremium", n)} hint="가족 직원에 대한 국민연금·건강·장기요양·고용·산재의 사업주 부담 합계. 필요경비 인정 금액만 입력. 대표자 가입 전환은 별도 감수." />
            <MoneyField label="직원 부담 국민연금 (원)" value={input.workerPension} onChange={n => set("workerPension", n)} hint="고용으로 새로 납부하는 실제 연간 개인 부담액입니다." />
            <MoneyField label="직원 부담 건강·장기요양·고용보험 (원)" value={input.workerOtherPremium} onChange={n => set("workerOtherPremium", n)} hint="산재보험은 직원 부담에 넣지 않습니다." />
            <label className="flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" checked={input.insuranceConfirmed} onChange={e => set("insuranceConfirmed", e.target.checked)} className="mt-1 accent-accent" /><span>공단에서 보험별 근로자성·가입 예외와 실제 부담액을 확인했고, 사업주 입력액의 필요경비 귀속을 확인했습니다. 대표자 가입 전환 효과가 있으면 별도 Josh 감수가 필요함을 이해했습니다.</span></label>
          </div></fieldset>
        </form>
        <div className="mt-6 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
          <button type="button" onClick={() => { setInput(SAMPLE_FAMILY_INPUT); setMessage("가상의 금액과 확인 상태를 넣은 계산 예시입니다. 보험 법정 요율이나 적용 확정 사례가 아닙니다."); }} className="underline underline-offset-4">가상 예시 불러오기</button>
          <button type="button" onClick={() => { setInput(DEFAULT_FAMILY_INPUT); setMessage(""); window.history.replaceState(null, "", window.location.pathname); }} className="text-muted underline underline-offset-4">입력 초기화</button>
          {encoded && <button type="button" onClick={copyLink} className="underline underline-offset-4">입력값 포함 링크 복사</button>}
        </div>
        <p className="mt-3 text-xs text-muted">공유 링크에는 입력 금액과 확인 항목이 포함됩니다.</p>
        {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
      </div>
      <div className="min-w-0" aria-live="polite">{result ? <><FamilyResult input={input} result={result} /><a href={`/tools/family-payroll/report?s=${encoded}`} className="no-print mt-8 inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a></> : <div className="border-t border-ink pt-6"><h2 className="text-xl">입력 금액을 확인해 주세요</h2><ul role="alert" className="mt-4 list-disc space-y-2 pl-5 text-sm text-warn">{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}</div>
    </div>
  </main>;
}
