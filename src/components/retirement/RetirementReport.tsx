"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeRetirement } from "@/lib/tax/retirement/engine";
import { decodeRetirement } from "@/lib/tax/retirement/share";
import { RETIREMENT_RATES_VERSION } from "@/lib/tax/retirement/version";
import { RetirementResult } from "./RetirementResult";

export function RetirementReport() {
  const params = useSearchParams();
  const s = params.get("s");
  const decoded = s ? decodeRetirement(s) : null;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
    <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">인쇄 대화상자에서 PDF로 저장할 수 있습니다.</p><button type="button" onClick={() => window.print()} className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
    <header className="border-b-2 border-ink pb-6"><p className="text-xs tracking-[0.18em] text-muted">09 / 연재 · 검토보고서</p><h1 className="mt-2 text-balance text-2xl font-medium">퇴직소득세 검토보고서</h1><p className="mt-2 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {RETIREMENT_RATES_VERSION}</p></header>
    {decoded && !decoded.ok && <p role="alert" className="mt-6 text-sm text-accent">{decoded.reason} — {LINK_ERROR_NEXT}</p>}
    {decoded?.ok && decoded.ratesChanged && <p className="mt-6 border border-warn px-4 py-3 text-sm text-warn">다른 세율 버전의 링크입니다. 현재 버전으로 다시 계산한 보고서입니다.</p>}
    {decoded?.ok ? <div className="mt-8"><RetirementResult input={decoded.input} result={computeRetirement(decoded.input)} /></div> : <p className="mt-8 text-sm leading-relaxed text-muted">입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기에서 「검토보고서 (인쇄·PDF)」를 눌러 주세요.</p>}
  </article>;
}
