"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeGiftInheritance } from "@/lib/tax/gift-inheritance/engine";
import { DEFAULT_GIFT_INHERITANCE } from "@/lib/tax/gift-inheritance/input";
import { decodeGiftInheritance } from "@/lib/tax/gift-inheritance/share";
import { GIFT_INHERITANCE_RATES_VERSION } from "@/lib/tax/gift-inheritance/version";
import { GiftInheritanceResult } from "./GiftInheritanceResult";

export function GiftInheritanceReport() {
  const searchParams = useSearchParams();
  const s = searchParams.get("s");
  const decoded = s ? decodeGiftInheritance(s) : null;
  const input = decoded && decoded.ok ? decoded.input : DEFAULT_GIFT_INHERITANCE;
  const result = computeGiftInheritance(input);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-8 flex items-center justify-between">
        <p className="text-xs text-muted">인쇄하면 A4에 맞게 줄어듭니다.</p>
        <button type="button" onClick={() => window.print()} className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas">
          인쇄/PDF 저장
        </button>
      </div>

      <header className="border-b-2 border-ink pb-6">
        <p className="text-xs tracking-[0.18em] text-muted">07 / 연재 · 검토보고서</p>
        <h1 className="mt-2 text-balance text-2xl font-medium">증여·상속 비교 검토보고서</h1>
        <p className="mt-2 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {GIFT_INHERITANCE_RATES_VERSION}</p>
      </header>

      {decoded && !decoded.ok && (
        <p className="mt-6 text-sm text-accent">
          {decoded.reason} — {LINK_ERROR_NEXT}
        </p>
      )}

      <div className="mt-8">
        <GiftInheritanceResult input={input} result={result} />
      </div>
    </article>
  );
}
