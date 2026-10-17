"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeLoanToOwner } from "@/lib/tax/loan-to-owner/engine";
import { DEFAULT_LOAN_INPUT, SAMPLE_LOAN_INPUT, loanInputErrors, type LoanToOwnerInput } from "@/lib/tax/loan-to-owner/input";
import { decodeLoanToOwner, encodeLoanToOwner } from "@/lib/tax/loan-to-owner/share";
import { LoanResult } from "./LoanResult";

const fieldClass = "mt-2 w-full border border-line bg-paper px-3 py-2 text-base num focus:border-ink focus:outline-2 focus:outline-ink";
function NumberField({ label, value, onChange, hint, max = 10_000_000_000_000, step = 1 }: { label: string; value: number | null; onChange: (n: number) => void; hint?: string; max?: number; step?: number }) {
  return <label className="block text-sm">{label}<input type="number" min={0} max={max} step={step} value={value === null || Number.isNaN(value) ? "" : value} onChange={e => onChange(e.target.value === "" ? NaN : e.target.valueAsNumber)} className={fieldClass} />{hint && <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>}</label>;
}

export function LoanCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => {
    const s = params.get("s");
    const d = s !== null ? decodeLoanToOwner(s) : null;
    return { input: d?.ok ? d.input : DEFAULT_LOAN_INPUT, error: d && !d.ok ? d.reason : null, changed: d?.ok ? d.ratesChanged : false };
  });
  const [input, setInput] = useState<LoanToOwnerInput>(initial.input);
  const [message, setMessage] = useState("");
  const errors = loanInputErrors(input);
  const result = useMemo(() => loanInputErrors(input).length ? null : computeLoanToOwner(input), [input]);
  const encoded = result ? encodeLoanToOwner(input) : null;
  const set = <K extends keyof LoanToOwnerInput>(key: K, value: LoanToOwnerInput[K]) => { setInput(p => ({ ...p, [key]: value })); setMessage(""); };
  async function copyLink() {
    if (!encoded) return;
    const url = new URL(window.location.href); url.search = ""; url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url);
    try { await navigator.clipboard.writeText(url.href); setMessage("입력값을 포함한 링크를 복사했습니다."); }
    catch { setMessage("주소창에 입력값을 담았습니다. 주소를 직접 복사해 주세요."); }
  }
  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <p className="text-xs tracking-[0.18em] text-muted">11 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">법인 가지급금 진단</h1>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">대표가 회사 돈을 개인 용도로 가져갔다면, 회사가 받아야 할 이자와 비용 제한을 함께 살펴보세요. 회사 세금 증가 추정과 개인 소득처분 위험을 근거 조문과 함께 보여줍니다.</p>
    <p className="mt-3 text-sm text-muted">2026년 일반 내국법인 · 12개월 사업연도 기준</p>
    {initial.error && <p role="alert" className="mt-6 border border-accent p-3 text-sm text-accent">{initial.error} — {LINK_ERROR_NEXT}</p>}
    {initial.changed && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">세율 버전이 바뀌었습니다. 현재 기준으로 다시 계산한 결과입니다.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print min-w-0 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <form onSubmit={e => e.preventDefault()} className="space-y-8">
          <fieldset><legend className="text-lg">개인이 가져간 회사 돈</legend><p className="mt-2 text-xs leading-relaxed text-muted">같은 사람에게 빌려준 단일 거래의 잔액입니다. 잔액이 바뀌었다면 겹치지 않는 기간으로 나누세요. 남은 기간은 잔액이 없는 것으로 봅니다.</p>
            <div className="mt-4 space-y-5">{input.periods.map((p, i) => <div key={i} className="border-t border-line pt-4">
              <p className="mb-3 text-xs text-muted">기간 {i + 1}</p>
              <NumberField label={`기간 ${i + 1} 잔액 (원)`} value={p.balance} onChange={balance => set("periods", input.periods.map((row, j) => j === i ? { ...row, balance } : row))} />
              <div className="mt-3"><NumberField label={`기간 ${i + 1} 일수`} max={365} value={p.days} onChange={days => set("periods", input.periods.map((row, j) => j === i ? { ...row, days } : row))} /></div>
              {input.periods.length > 1 && <button type="button" onClick={() => set("periods", input.periods.filter((_, j) => j !== i))} className="mt-2 text-xs text-accent underline">이 기간 지우기</button>}
            </div>)}</div>
            {input.periods.length < 12 && <button type="button" onClick={() => set("periods", [...input.periods, { balance: 0, days: 1 }])} className="mt-3 text-sm underline underline-offset-4">잔액이 바뀐 기간 추가</button>}
            <div className="mt-5"><NumberField label="해당 기간 실제 받은 이자 (원)" value={input.actualInterest} onChange={n => set("actualInterest", n)} hint="해당 기간분 중 회사의 세무상 이자 수익에 반영한 금액입니다. 미수이자는 Josh 감수 필요." /></div>
          </fieldset>
          <fieldset><legend className="text-lg">세법상 적용할 이자율</legend>
            <label className="mt-4 block text-sm">적용 방식<select value={input.rateMode} onChange={e => set("rateMode", e.target.value as LoanToOwnerInput["rateMode"])} className={fieldClass}><option value="weighted">가중평균차입이자율 (원칙)</option><option value="overdraft">당좌대출이자율 (요건 확인 후)</option></select></label>
            <p className="mt-2 text-xs leading-relaxed text-muted">가중평균차입이자율은 대여 당시 회사의 차입금 잔액과 이자율을 가중해 계산한 비율입니다.</p>
            {input.rateMode === "weighted" ? <div className="mt-4"><NumberField label="확인한 가중평균차입이자율 (연 %)" value={input.weightedRatePercent} step={0.01} max={100} onChange={n => set("weightedRatePercent", n)} hint="소수 둘째 자리까지. 비특수관계인 차입금 및 대여시점 적용 여부는 Josh 감수 필요." /></div> : <label className="mt-4 flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" checked={input.overdraftConfirmed} onChange={e => set("overdraftConfirmed", e.target.checked)} className="mt-1 accent-accent" /><span>가중평균차입이자율 적용 불가 등 법정 사유, 또는 당좌대출이자율 선택 신고와 구속기간을 확인했습니다. 법정 이자율과 근거는 결과의 밑줄에서 확인합니다.</span></label>}
          </fieldset>
          <fieldset><legend className="text-lg">회사의 차입금과 세금</legend><div className="mt-4 space-y-4">
            <NumberField label="연평균 차입금 (원)" value={input.averageBorrowings} onChange={n => set("averageBorrowings", n)} hint="일별 차입금 잔액의 합계를 연간 일수로 나눈 값. 연말 잔액과 다릅니다. 제외 차입금 확인 필요." />
            <NumberField label="해당 차입금의 연간 지급이자 (원)" value={input.borrowingInterest} onChange={n => set("borrowingInterest", n)} />
            <NumberField label="조정 전 법인 과세표준 (원)" value={input.corpTaxBase} onChange={n => set("corpTaxBase", n)} hint="인정이자와 지급이자 제한 반영 전, 결손금·세액공제가 없는 일반 법인으로 가정합니다." />
          </div></fieldset>
          <label className="block text-sm">돈을 가져간 사람<select value={input.recipient} onChange={e => set("recipient", e.target.value as LoanToOwnerInput["recipient"])} className={fieldClass}><option value="director">대표이사·임직원 (주주 포함)</option><option value="shareholder">임원·직원이 아닌 주주</option></select></label>
        </form>
        <div className="mt-6 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
          <button type="button" onClick={() => { setInput(SAMPLE_LOAN_INPUT); setMessage("가상의 예시입니다. 실제 적용 요건은 별도로 확인해 주세요."); }} className="underline underline-offset-4">가상 예시 불러오기</button>
          <button type="button" onClick={() => { setInput(DEFAULT_LOAN_INPUT); setMessage(""); window.history.replaceState(null, "", window.location.pathname); }} className="text-muted underline underline-offset-4">입력 초기화</button>
          {encoded && <button type="button" onClick={copyLink} className="underline underline-offset-4">입력값 포함 링크 복사</button>}
        </div>
        <p className="mt-3 text-xs text-muted">공유 링크에는 입력 금액이 포함됩니다.</p>
        {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
      </div>
      <div className="min-w-0" aria-live="polite">{result ? <><LoanResult input={input} result={result} /><a href={`/tools/loan-to-owner/report?s=${encoded}`} className="no-print mt-8 inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a></> : <div className="border-t border-ink pt-6 text-sm leading-relaxed"><h2 className="text-xl">적용할 이자율부터 확인해 주세요</h2><p className="mt-3 text-muted">입력을 마치면 회사 세금과 개인 소득처분 위험이 나옵니다.</p><ul className="mt-4 list-disc space-y-2 pl-5 text-warn">{errors.map(e => <li key={e}>{e}</li>)}</ul><p className="mt-5 text-muted">이자율이나 거래의 업무 관련성이 불분명하면 Josh 감수 필요 항목으로 확인해 주세요.</p></div>}</div>
    </div>
  </main>;
}
