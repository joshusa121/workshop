"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeStartupRelief } from "@/lib/tax/startup-relief/engine";
import { decodeStartupRelief } from "@/lib/tax/startup-relief/share";
import { STARTUP_RELIEF_RATES_VERSION } from "@/lib/tax/startup-relief/version";
import { StartupReliefResult } from "./StartupReliefResult";

export function StartupReliefReport() {
  const s = useSearchParams().get("s");
  const decoded = s ? decodeStartupRelief(s) : null;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  return (
    <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">인쇄하면 보고서 본문만 출력합니다.</p>
        <button type="button" onClick={() => window.print()} className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button>
      </div>
      <header className="border-b-2 border-ink pb-6">
        <p className="text-xs tracking-[0.18em] text-muted">12 / 연재 · 검토보고서</p>
        <h1 className="mt-2 text-balance text-2xl font-medium">창업중소기업 감면 검토보고서</h1>
        <p className="mt-2 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {STARTUP_RELIEF_RATES_VERSION}</p>
      </header>
      {decoded && !decoded.ok && <p role="alert" className="mt-6 text-sm text-accent">{decoded.reason} — {LINK_ERROR_NEXT}</p>}
      {decoded?.ok ? <>
        {decoded.ratesChanged && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">저장 후 세법 버전이 바뀌었습니다. 현재 기준으로 다시 계산했습니다.</p>}
        <div className="mt-8"><StartupReliefResult input={decoded.input} result={computeStartupRelief(decoded.input)} /></div>
      </> : <p className="mt-8 text-sm leading-relaxed text-muted">입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기에서 「검토보고서 (인쇄·PDF)」를 눌러 주세요. <a href="/tools/startup-relief" className="underline">계산기로 이동</a></p>}
    </article>
  );
}
