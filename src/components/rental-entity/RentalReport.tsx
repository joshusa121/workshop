"use client";
import { useSearchParams } from "next/navigation";
import { DISCLAIMER } from "@/lib/catalog";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { traced } from "@/lib/tax/trace";
import { MODEL_BASIS } from "@/lib/tax/rental-entity/rates-2026";
import { computeRental } from "@/lib/tax/rental-entity/engine";
import { decodeRental } from "@/lib/tax/rental-entity/share";
import { RENTAL_RATES_VERSION } from "@/lib/tax/rental-entity/version";
import { RentalResult } from "./RentalResult";

export function RentalReport() {
  const params = useSearchParams();
  const s = params.get("s");
  const decoded = s ? decodeRental(s) : null;
  const input = decoded?.ok ? decoded.input : null;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
    <div className="no-print mb-8 flex items-center justify-between gap-4"><p className="text-xs text-muted">브라우저 인쇄에서 PDF로 저장할 수 있습니다.</p><button type="button" onClick={() => window.print()} className="shrink-0 border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
    <header className="border-b-2 border-ink pb-6">
      <p className="text-xs tracking-[0.18em] text-muted">10 / 연재 · 검토보고서</p>
      <h1 className="mt-2 text-balance text-2xl font-medium">부동산 임대 개인 vs 법인 검토보고서</h1>
      <p className="mt-2 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {RENTAL_RATES_VERSION}</p>
    </header>
    {decoded && !decoded.ok && <p role="alert" className="mt-6 text-sm text-warn">{decoded.reason} — {LINK_ERROR_NEXT}</p>}
    {decoded?.ok && decoded.ratesChanged && <p className="mt-6 border border-warn p-3 text-sm text-warn">원래 링크와 세율 버전이 달라 최신 버전으로 다시 계산한 보고서입니다.</p>}
    {input ? <>
      <section className="my-8 border-b border-line pb-5 text-sm leading-relaxed">
        <h2 className="text-xl">입력 전제</h2>
        <p className="mt-3">{input.kind === "housing" ? "과세대상 주택" : "상가 등 주택 외"} 임대 · {input.registered ? "전 기간 적격 등록 특례 적용" : "등록 주택 특례 미적용"} · {input.smallCorp ? "소규모 임대 등 법인 해당" : "일반 법인"}</p>
        <div className="mt-2">다른 종합소득금액 <TraceValue t={traced("다른 종합소득금액", input.otherIncome, ["임대·금융소득 제외, 소득공제 전 사용자 입력값"], [MODEL_BASIS])} /></div>
        <div className="mt-2">다른 이자·배당 <TraceValue t={traced("다른 금융소득", input.otherFinancial, ["국내 일반 원천징수 세전 금융소득, 이 법인 배당 제외"], [MODEL_BASIS])} /></div>
        <p className="mt-2">세후 법인이익 중 배당 비율 {input.dividendPercent}% · 대표 급여 없음</p>
      </section>
      <RentalResult input={input} result={computeRental(input)} />
    </> : <><p className="mt-8 text-sm leading-relaxed text-muted">입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기에서 「검토보고서 (인쇄·PDF)」를 눌러 주세요.</p><p className="mt-8 text-xs text-muted">{DISCLAIMER}</p></>}
  </article>;
}
