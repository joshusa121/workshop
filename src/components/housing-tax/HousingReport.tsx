"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DISCLAIMER } from "@/lib/catalog";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeHousing } from "@/lib/tax/housing-tax/engine";
import { decodeHousing } from "@/lib/tax/housing-tax/share";
import { HOUSING_RATES_VERSION } from "@/lib/tax/housing-tax/version";
import { HousingResult } from "./HousingResult";
export function HousingReport() {
  const params = useSearchParams();
  const decoded = params.has("s") ? decodeHousing(params.get("s") ?? "") : null;
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
    <div className="no-print mb-8 flex items-center justify-between gap-4 text-sm"><Link href={decoded?.ok ? `/tools/housing-tax?s=${params.get("s")}` : "/tools/housing-tax"} className="underline">입력 화면으로</Link><button type="button" onClick={() => window.print()} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
    <header className="border-b-2 border-ink pb-6"><p className="text-xs text-muted">14 / 연재 · 검토보고서</p><h1 className="mt-2 text-balance text-2xl font-medium">주택 세금 검토보고서</h1><p className="mt-2 text-xs text-muted">작업실 · 작성일 {new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })} · 세율 버전 {HOUSING_RATES_VERSION}</p><p className="mt-3 text-xs leading-relaxed text-muted">{DISCLAIMER}</p></header>
    {decoded && !decoded.ok && <p role="alert" className="mt-6 text-sm text-warn">{decoded.reason} {LINK_ERROR_NEXT}</p>}
    {decoded?.ok && decoded.ratesChanged && <p role="status" className="mt-6 text-sm text-warn">공유 시점 이후 세율 버전이 바뀌어 현재 버전으로 다시 계산했습니다.</p>}
    {decoded?.ok ? <div className="mt-8"><HousingResult input={decoded.input} result={computeHousing(decoded.input)} /></div> : <p className="mt-8 text-sm leading-relaxed text-muted">유효한 입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기 화면의 「검토보고서 (인쇄·PDF)」 버튼으로 다시 열어 주세요.</p>}
  </article>;
}
