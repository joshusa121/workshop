"use client";

import { useSearchParams } from "next/navigation";
import { DISCLAIMER } from "@/lib/catalog";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeWithholding } from "@/lib/tax/withholding/engine";
import { decodeWithholding } from "@/lib/tax/withholding/share";
import { WITHHOLDING_RATES_VERSION } from "@/lib/tax/withholding/version";
import { WithholdingResult } from "./WithholdingResult";

export function WithholdingReport() {
  const params = useSearchParams();
  const s = params.get("s");
  const decoded = s !== null ? decodeWithholding(s) : null;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
    <div className="no-print mb-8 flex items-center justify-between gap-4 text-sm">
      <a href={decoded?.ok ? `/tools/withholding?s=${s}` : "/tools/withholding"} className="text-muted underline underline-offset-4">계산기로 돌아가기</a>
      <button type="button" onClick={() => window.print()} className="border border-ink px-3 py-1.5 hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button>
    </div>
    <header className="border-b-2 border-ink pb-6">
      <p className="text-xs tracking-[0.18em] text-muted">21 / 연재 · 검토보고서</p>
      <h1 className="mt-2 text-balance text-2xl font-medium">원천세 검토보고서</h1>
      <p className="mt-2 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {WITHHOLDING_RATES_VERSION}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
    </header>
    {decoded?.ok ? <div className="mt-8">
      {decoded.ratesChanged && <p role="alert" className="mb-6 border border-warn p-3 text-sm text-warn">공유 당시와 세율 버전이 다릅니다. 현재 세법으로 다시 계산한 보고서입니다.</p>}
      <WithholdingResult input={decoded.input} result={computeWithholding(decoded.input)} />
    </div> : <p role="alert" className="mt-8 text-sm leading-relaxed text-accent">{decoded ? `${decoded.reason} — ${LINK_ERROR_NEXT}` : "입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기에서 검토보고서 버튼을 눌러 주세요."}</p>}
  </article>;
}
