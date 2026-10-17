"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeCgt } from "@/lib/tax/cgt/cgt";
import { EMPTY_CGT_INPUT, isComplete } from "@/lib/tax/cgt/defaults";
import { decodeCgt } from "@/lib/tax/cgt/share";
import { CGT_RATES_VERSION } from "@/lib/tax/cgt/version";
import { CgtResult } from "./CgtResult";

export function CgtReport() {
  const searchParams = useSearchParams();
  const s = searchParams.get("s");
  const decoded = s ? decodeCgt(s) : null;
  const valid = decoded !== null && decoded.ok && isComplete(decoded.input);
  const input = decoded && decoded.ok ? decoded.input : EMPTY_CGT_INPUT;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-8 flex items-center justify-between">
        <p className="text-xs text-muted">인쇄하면 A4에 맞게 줄어듭니다.</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas"
        >
          인쇄/PDF 저장
        </button>
      </div>

      <header className="border-b-2 border-ink pb-6">
        <p className="text-xs tracking-[0.18em] text-muted">03 / 연재 · 검토보고서</p>
        <h1 className="mt-2 text-balance text-2xl font-medium">주택 양도세 검토보고서</h1>
        <p className="mt-2 text-xs text-muted">
          작업실 · 작성일 {today} · 세율 버전 {CGT_RATES_VERSION}
        </p>
      </header>

      {decoded && !decoded.ok && (
        <p className="mt-6 text-sm text-accent">
          {decoded.reason} — {LINK_ERROR_NEXT}
        </p>
      )}

      {valid ? (
        <div className="mt-8">
          <CgtResult input={input} result={computeCgt(input)} />
        </div>
      ) : (
        <p className="mt-8 border-t border-ink pt-6 text-sm leading-relaxed text-muted">
          입력값이 담긴 링크로 열어야 보고서가 채워집니다. 계산기 화면에서 「검토보고서 (인쇄·PDF)」 버튼으로 열어 주세요.
        </p>
      )}
    </article>
  );
}
