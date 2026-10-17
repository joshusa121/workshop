"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeLoanToOwner } from "@/lib/tax/loan-to-owner/engine";
import { decodeLoanToOwner } from "@/lib/tax/loan-to-owner/share";
import { LOAN_TO_OWNER_RATES_VERSION } from "@/lib/tax/loan-to-owner/version";
import { LoanResult } from "./LoanResult";

export function LoanReport() {
  const params = useSearchParams();
  const s = params.get("s");
  const decoded = s !== null ? decodeLoanToOwner(s) : null;
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
    <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">브라우저 인쇄에서 PDF로 저장할 수 있습니다.</p><button type="button" onClick={() => window.print()} className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
    <header className="border-b-2 border-ink pb-6"><p className="text-xs tracking-[0.18em] text-muted">11 / 연재 · 검토보고서</p><h1 className="mt-2 text-balance text-2xl font-medium">법인 가지급금 검토보고서</h1><p className="mt-2 text-xs text-muted">작업실 · 작성일 {date} · 세율 버전 {LOAN_TO_OWNER_RATES_VERSION}</p></header>
    {decoded?.ok ? <div className="mt-8">{decoded.ratesChanged && <p role="alert" className="mb-6 border border-warn p-3 text-sm text-warn">세율 버전이 바뀌어 현재 기준으로 다시 계산했습니다.</p>}<LoanResult input={decoded.input} result={computeLoanToOwner(decoded.input)} /></div> : <div className="mt-8 text-sm leading-relaxed">{decoded && <p role="alert" className="mb-4 text-accent">{decoded.reason} — {LINK_ERROR_NEXT}</p>}<p>입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기에서 검토보고서 버튼을 눌러 주세요.</p><a href="/tools/loan-to-owner" className="mt-4 inline-block underline">가지급금 진단으로 돌아가기</a></div>}
  </article>;
}
