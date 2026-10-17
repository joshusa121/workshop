"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { traced } from "@/lib/tax/trace";
import { computeChecklist } from "@/lib/tax/filing-checklist/engine";
import { DEFAULT_INPUT, METHODS, PROFILES, validateInput, type ChecklistInput } from "@/lib/tax/filing-checklist/input";
import { RECEIPT_LIMIT, SMALL_REVENUE_LIMIT } from "@/lib/tax/filing-checklist/rates";
import { decodeChecklist, encodeChecklist } from "@/lib/tax/filing-checklist/share";
import { ChecklistResult } from "./ChecklistResult";

export function ChecklistCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => {
    const s = params.get("s");
    const d = s ? decodeChecklist(s) : null;
    return { input: d?.ok ? d.input : DEFAULT_INPUT, ratesChanged: d?.ok ? d.ratesChanged : false, error: d && !d.ok ? d.reason : null };
  });
  const [input, setInput] = useState<ChecklistInput>(initial.input);
  const [changed, setChanged] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const errors = validateInput(input);
  const valid = errors.length === 0;
  const result = valid ? computeChecklist(input) : null;
  const code = valid ? encodeChecklist(input) : null;
  function update(patch: Partial<ChecklistInput>) { setInput(current => ({ ...current, ...patch })); setChanged(true); setCopyMessage(""); }
  useEffect(() => {
    if (!code || (initial.error && !changed)) return;
    const timer = window.setTimeout(() => window.history.replaceState(null, "", `?s=${code}`), 250);
    return () => window.clearTimeout(timer);
  }, [code, initial.error, changed]);
  async function copyLink() {
    if (!code) return;
    try {
      const url = new URL(window.location.href); url.search = new URLSearchParams({ s: code }).toString();
      await navigator.clipboard.writeText(url.toString()); setCopyMessage("링크를 복사했습니다.");
    } catch { setCopyMessage("복사하지 못했습니다. 주소창의 링크를 직접 복사해 주세요."); }
  }
  const field = "mt-2 w-full border border-line bg-paper px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";
  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <p className="text-xs tracking-[0.18em] text-muted">20 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">신고 서류 체크리스트</h1>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">2026년 귀속 종합소득세 신고를 앞두고, 내게 필요한 서류부터 정리합니다. 신고 유형과 장부 작성 방식을 고르고 준비한 서류를 표시하세요. 목록과 준비 상태를 링크로 이어 볼 수 있습니다.</p>
    {initial.error && <p role="alert" className="mt-6 border border-accent p-3 text-sm text-accent">{initial.error} — {LINK_ERROR_NEXT}</p>}
    {initial.ratesChanged && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">이전 근거 버전의 링크입니다. 최신 기준으로 목록을 다시 확인해 주세요.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <form onSubmit={e => e.preventDefault()} className="space-y-6">
          <div><label htmlFor="profile" className="text-sm">신고 유형</label><select id="profile" className={field} value={input.profile} onChange={e => update({ profile: e.target.value as ChecklistInput["profile"] })}>{Object.entries(PROFILES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><p className="mt-2 text-xs leading-relaxed text-muted">대상 여부를 이미 확인한 유형을 고르세요. 여기서는 신고의무·성실신고 대상 여부를 자동 판정하지 않습니다.</p></div>
          <div><label htmlFor="method" className="text-sm">사업소득 신고방식</label><select id="method" className={field} value={input.method} onChange={e => update({ method: e.target.value as ChecklistInput["method"] })}>{Object.entries(METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><p className="mt-2 text-xs leading-relaxed text-muted">간편장부는 수입·지출을 간단히 적는 방식, 복식부기는 계정별로 장부를 작성하는 방식입니다. 추계는 장부 없이 경비율 등으로 소득을 계산합니다. 선택한 방식이 가능한지는 Josh 감수 필요.</p></div>
          <fieldset className="space-y-3 border-t border-line pt-5"><legend className="text-sm">공제·별도 명세</legend>{([
            ["claimsDeductions", "소득공제·세액공제 증빙이 필요합니다"],
            ["specialExpenses", "충당금·보험차익·국고보조금 관련 필요경비 명세가 있습니다"],
          ] as const).map(([key, label]) => <label key={key} className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 accent-ink" checked={input[key]} onChange={e => update({ [key]: e.target.checked })} />{label}</label>)}</fieldset>
          <fieldset className="space-y-4 border-t border-line pt-5"><legend className="text-sm">영수증 수취명세서 확인</legend><p className="text-xs leading-relaxed text-muted">계산서·세금계산서·신용카드매출전표·현금영수증이 아닌 일반 영수증을 확인합니다.</p>
            <div><label htmlFor="previousRevenue" className="text-sm">직전 과세기간 사업 수입금액 (원)</label><input id="previousRevenue" type="number" min="0" max="1000000000000" step="1" className={`${field} num`} value={input.previousRevenue} onChange={e => update({ previousRevenue: Number(e.target.value) })} /></div>
            <div><label htmlFor="largestOtherReceipt" className="text-sm">일반 영수증 중 가장 큰 거래 한 건 (원)</label><input id="largestOtherReceipt" type="number" min="0" max="1000000000000" step="1" className={`${field} num`} value={input.largestOtherReceipt} onChange={e => update({ largestOtherReceipt: Number(e.target.value) })} /><p className="mt-2 text-xs text-muted">해당 거래가 없으면 영으로 둡니다.</p></div>
            <div className="text-xs leading-relaxed text-muted">거래 한 건 <TraceValue t={traced("영수증 거래 경계", RECEIPT_LIMIT.value, ["이 금액을 초과한 거래를 확인합니다."], [RECEIPT_LIMIT.basis])} /> 초과, 직전 수입 <TraceValue t={traced("소규모사업자 경계", SMALL_REVENUE_LIMIT.value, ["이 금액 미만은 소규모사업자 제외 대상입니다. 정확히 같은 금액은 미만에 해당하지 않습니다."], [SMALL_REVENUE_LIMIT.basis])} /> 미만 여부가 기준입니다.</div>
            {([["newBusiness", "해당 과세기간에 새로 개업했습니다"], ["settledBusinessOnly", "법정 연말정산 사업소득만 있습니다"]] as const).map(([key, label]) => <label key={key} className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 accent-ink" checked={input[key]} onChange={e => update({ [key]: e.target.checked })} />{label}</label>)}
            <p className="text-xs leading-relaxed text-muted">법정 연말정산 사업소득은 소득세법의 확정신고 예외 대상인 경우만 선택합니다. 프리랜서의 원천징수만으로는 해당 여부를 알 수 없습니다. Josh 감수 필요.</p>
          </fieldset>
        </form>
        <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted">금액과 준비 상태가 공유 URL에 담깁니다. 고객 식별정보를 입력하지 마세요. 이 화면은 서류를 수집하거나 신고서를 제출하지 않습니다.</p>
      </div>
      <div aria-live="polite">{result && code ? <>
        <ChecklistResult input={input} result={result} onStatus={(id, status) => update({ statuses: { ...input.statuses, [id]: status } })} />
        <div className="no-print mt-8 flex flex-wrap gap-3 border-t border-line pt-5 text-sm"><button type="button" onClick={copyLink} className="border border-ink px-4 py-2 hover:bg-ink hover:text-canvas">준비 상태 링크 복사</button><a href={`/tools/filing-checklist/report?s=${code}`} className="border border-ink px-4 py-2 hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a></div><p role="status" className="mt-3 text-sm text-muted">{copyMessage}</p>
      </> : <div role="alert" className="border-t border-accent pt-5 text-sm text-accent">{errors.map(error => <p key={error}>{error}</p>)}</div>}</div>
    </div>
  </main>;
}
