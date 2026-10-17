"use client";

import { useSearchParams } from "next/navigation";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { traced } from "@/lib/tax/trace";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeChecklist } from "@/lib/tax/filing-checklist/engine";
import { METHODS, PROFILES } from "@/lib/tax/filing-checklist/input";
import { decodeChecklist } from "@/lib/tax/filing-checklist/share";
import { CHECKLIST_VERSION } from "@/lib/tax/filing-checklist/version";
import { ChecklistResult } from "./ChecklistResult";
export function ChecklistReport() {
  const s = useSearchParams().get("s");
  const decoded = s ? decodeChecklist(s) : null;
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 print:max-w-none print:px-0">
    <div className="no-print mb-8 flex items-center justify-between gap-4"><a href={decoded?.ok ? `/tools/filing-checklist?s=${s}` : "/tools/filing-checklist"} className="text-sm underline underline-offset-4">체크리스트로 돌아가기</a><button type="button" onClick={() => window.print()} className="border border-ink px-3 py-2 text-sm hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
    <header className="border-b-2 border-ink pb-6"><p className="text-xs tracking-[0.18em] text-muted">20 / 연재 · 검토보고서</p><h1 className="mt-2 text-balance text-2xl font-medium">신고 서류 검토보고서</h1><p className="mt-2 text-xs text-muted">작업실 · 작성일 {new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date())} · 세율 버전 {CHECKLIST_VERSION}</p></header>
    {decoded?.ok ? <div className="mt-8">{decoded.ratesChanged && <p className="mb-6 text-sm text-warn">이전 근거 버전의 링크입니다. 최신 기준으로 다시 확인해 주세요.</p>}<p className="mb-5 text-sm">2026년 귀속 · {PROFILES[decoded.input.profile]} · {METHODS[decoded.input.method]}</p><section className="mb-8 border-y border-line py-4 text-sm leading-relaxed"><h2 className="font-medium">입력 전제</h2><dl className="mt-3 space-y-2">{([['직전 사업 수입금액', decoded.input.previousRevenue], ['가장 큰 일반 영수증 거래', decoded.input.largestOtherReceipt]] as const).map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd><TraceValue t={traced(label, value, ["공유 링크에 담긴 사용자 입력값입니다."], [{ kind: "assumption", description: "사용자 입력. 실제 자료와의 대조는 Josh 감수 필요.", editable: true }])} /></dd></div>)}</dl><ul className="mt-3 space-y-1 text-muted"><li>신규 개업: {decoded.input.newBusiness ? "예" : "아니오"}</li><li>법정 연말정산 사업소득만 있음: {decoded.input.settledBusinessOnly ? "예" : "아니오"}</li><li>공제 증빙 필요: {decoded.input.claimsDeductions ? "예" : "아니오"}</li><li>별도 필요경비 명세 있음: {decoded.input.specialExpenses ? "예" : "아니오"}</li></ul></section><ChecklistResult input={decoded.input} result={computeChecklist(decoded.input)} /></div> : <p role="alert" className="mt-8 text-sm leading-relaxed text-accent">{decoded ? `${decoded.reason} — ${LINK_ERROR_NEXT}` : "입력값이 담긴 링크로 열어야 보고서가 채워집니다. 체크리스트에서 검토보고서 버튼으로 열어 주세요."}</p>}
  </article>;
}
