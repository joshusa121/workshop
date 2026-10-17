"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { decodeSincere } from "@/lib/tax/sincere-filing/share";
import { computeSincereFiling } from "@/lib/tax/sincere-filing/engine";
import { SINCERE_VERSION } from "@/lib/tax/sincere-filing/version";
import { SincereResult } from "./SincereResult";

export function SincereReport() {
  const params = useSearchParams();
  const code = params.get("s");
  const decoded = code ? decodeSincere(code) : null;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return (
    <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4 text-sm"><a href={decoded?.ok ? `/tools/sincere-filing?s=${code}` : "/tools/sincere-filing"} className="underline">입력 수정</a><button type="button" onClick={() => window.print()} className="border border-ink px-3 py-1.5 hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
      <header className="border-b-2 border-ink pb-6"><p className="text-xs text-muted">13 / 연재 · 검토보고서</p><h1 className="mt-2 text-balance text-2xl">성실신고확인대상 판정 검토보고서</h1><p className="mt-2 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {SINCERE_VERSION}</p></header>
      {decoded && !decoded.ok && <p role="alert" className="mt-6 text-sm text-accent">{decoded.reason} — {LINK_ERROR_NEXT}</p>}
      {decoded?.ok && decoded.ratesChanged && <p role="status" className="mt-6 text-sm text-warn">링크의 세율 버전이 다릅니다. 현재 버전으로 다시 판정했습니다.</p>}
      {decoded?.ok ? <div className="mt-8"><SincereResult input={decoded.input} result={computeSincereFiling(decoded.input)} /></div> : <p className="mt-8 text-sm leading-relaxed text-muted">입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기에서 「검토보고서 (인쇄·PDF)」를 눌러 열어 주세요.</p>}
    </article>
  );
}
