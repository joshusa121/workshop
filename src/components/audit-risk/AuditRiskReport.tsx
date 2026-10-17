"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { DISCLAIMER } from "@/lib/catalog";
import { computeAuditRisk } from "@/lib/tax/audit-risk/engine";
import { decodeAuditRisk } from "@/lib/tax/audit-risk/share";
import { AUDIT_RISK_RATES_VERSION } from "@/lib/tax/audit-risk/version";
import { AuditRiskResult } from "./AuditRiskResult";

export function AuditRiskReport() {
  const params = useSearchParams();
  const s = params.get("s");
  const decoded = s !== null ? decodeAuditRisk(s) : null;
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
    <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3"><a href={`/tools/audit-risk${decoded?.ok ? `?s=${s}` : ""}`} className="text-sm underline underline-offset-4">점검표 수정</a><button type="button" onClick={() => window.print()} className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
    <header className="border-b-2 border-ink pb-6"><p className="text-xs tracking-[0.18em] text-muted">16 / 연재 · 검토보고서</p><h1 className="mt-2 text-balance text-2xl font-medium">세무조사 리스크 검토보고서</h1><p className="mt-2 text-xs text-muted">작업실 · 작성일 {new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })} · 세율 버전 {AUDIT_RISK_RATES_VERSION}</p></header>
    {decoded && !decoded.ok && <p role="alert" className="mt-6 text-sm text-accent">{decoded.reason} — {LINK_ERROR_NEXT}</p>}
    {decoded?.ok && decoded.ratesChanged && <p role="alert" className="mt-6 text-sm text-warn">세율·검토 기준 버전이 바뀌어 현재 기준으로 다시 계산했습니다.</p>}
    {decoded?.ok ? <div className="mt-8"><AuditRiskResult input={decoded.input} result={computeAuditRisk(decoded.input)} /></div> : <><p className="mt-8 text-sm leading-relaxed text-muted">입력값이 담긴 링크로 열어야 보고서가 채워집니다. 점검표 화면에서 「검토보고서 (인쇄·PDF)」를 눌러 주세요.</p><p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p></>}
  </article>;
}
