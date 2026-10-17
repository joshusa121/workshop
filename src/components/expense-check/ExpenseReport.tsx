"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { DISCLAIMER } from "@/lib/catalog";
import { computeExpense } from "@/lib/tax/expense-check/engine";
import { decodeExpense } from "@/lib/tax/expense-check/share";
import { EXPENSE_VERSION } from "@/lib/tax/expense-check/version";
import { ExpenseResult } from "./ExpenseResult";

export function ExpenseReport() {
  const params = useSearchParams();
  const s = params.get("s");
  const decoded = s !== null ? decodeExpense(s) : null;
  return <article className="mx-auto max-w-3xl break-keep px-5 py-10 text-pretty print:max-w-none print:px-0">
    <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
      <a className="underline underline-offset-4" href={`/tools/expense-check${s ? `?s=${encodeURIComponent(s)}` : ""}`}>입력 화면</a>
      <button type="button" onClick={() => window.print()} className="border border-ink px-3 py-1.5 hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button>
    </div>
    <header className="mb-8 border-b-2 border-ink pb-6">
      <p className="text-xs text-muted">17 / 연재 · 검토보고서</p>
      <h1 className="mt-2 text-balance text-2xl font-medium">경비처리 검토보고서</h1>
      <p className="mt-3 text-xs text-muted">작업실 · 작성일 {new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date())} · 세율 버전 {EXPENSE_VERSION}</p>
    </header>
    {decoded?.ok ? <>
      {decoded.ratesChanged && <p role="alert" className="mb-6 border border-warn p-3 text-sm text-warn">공유 당시와 세율 버전이 다릅니다. 현행 기준으로 재계산한 결과입니다.</p>}
      <ExpenseResult input={decoded.input} result={computeExpense(decoded.input)} />
    </> : <><p role="alert" className="text-sm leading-relaxed text-warn">{decoded ? `${decoded.reason} · ${LINK_ERROR_NEXT}` : "입력값이 담긴 링크로 열어야 보고서가 채워집니다. 판정 화면에서 검토보고서 버튼을 눌러 주세요."}</p><p className="mt-8 text-xs leading-relaxed text-muted">{DISCLAIMER}</p></>}
  </article>;
}
