"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeFamilySuccession } from "@/lib/tax/family-succession/engine";
import { decodeFamilySuccession } from "@/lib/tax/family-succession/share";
import { FAMILY_SUCCESSION_RATES_VERSION } from "@/lib/tax/family-succession/version";
import { FamilySuccessionResult } from "./FamilySuccessionResult";

export function FamilySuccessionReport() {
  const params = useSearchParams();
  const s = params.get("s");
  const decoded = s ? decodeFamilySuccession(s) : null;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0 print:py-0">
    <div className="no-print mb-8 flex items-center justify-between gap-4"><a className="text-sm underline" href={decoded?.ok ? `/tools/family-succession?s=${s}` : "/tools/family-succession"}>계산기로 돌아가기</a><button type="button" onClick={() => window.print()} className="border border-ink px-3 py-2 text-sm hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
    <header className="border-b-2 border-ink pb-6"><p className="text-xs text-muted">15 / 연재 · 검토보고서</p><h1 className="mt-2 text-balance text-2xl font-medium">가업승계 공제 검토보고서</h1><p className="mt-2 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {FAMILY_SUCCESSION_RATES_VERSION}</p></header>
    {decoded && !decoded.ok && <p role="alert" className="mt-6 text-sm text-accent">{decoded.reason} · {LINK_ERROR_NEXT}</p>}
    {decoded?.ok ? <>
      {decoded.ratesChanged && <p className="mt-6 border border-warn p-3 text-sm text-warn">저장할 때와 세율 버전이 다릅니다. 현재 법령으로 재계산했습니다. Josh 감수 필요.</p>}
      <div className="mt-8"><FamilySuccessionResult input={decoded.input} result={computeFamilySuccession(decoded.input)} /></div>
    </> : <p className="mt-8 text-sm leading-relaxed text-muted">입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기에서 「검토보고서 (인쇄·PDF)」를 눌러 주세요.</p>}
  </article>;
}
