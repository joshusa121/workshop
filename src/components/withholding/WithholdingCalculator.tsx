"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeWithholding } from "@/lib/tax/withholding/engine";
import { DEFAULT_WITHHOLDING, isWithholdingInput, KIND_LABELS, MAX_AMOUNT, OTHER_LABELS, type WithholdingInput } from "@/lib/tax/withholding/input";
import { decodeWithholding, encodeWithholding } from "@/lib/tax/withholding/share";
import { WITHHOLDING_CONFIRMED_AT, WITHHOLDING_RATES_VERSION } from "@/lib/tax/withholding/version";
import { WithholdingResult } from "./WithholdingResult";

const field = "mt-2 w-full border border-line bg-paper px-3 py-2 text-base outline-offset-2 focus:outline-ink";
const draftOf = (v: WithholdingInput) => ({ ...v, gross: String(v.gross), actualExpenses: String(v.actualExpenses) });

export function WithholdingCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => {
    const s = params.get("s");
    const decoded = s !== null ? decodeWithholding(s) : null;
    return { input: decoded?.ok ? decoded.input : DEFAULT_WITHHOLDING,
      linkError: decoded && !decoded.ok ? decoded.reason : null, ratesChanged: decoded?.ok && decoded.ratesChanged };
  });
  const [draft, setDraft] = useState(() => draftOf(initial.input));
  const [copyMessage, setCopyMessage] = useState("");
  const asAmount = (s: string) => /^\d+$/.test(s) ? Number(s) : NaN;
  const candidate = { ...draft, gross: asAmount(draft.gross), actualExpenses: asAmount(draft.actualExpenses) };
  const input = isWithholdingInput(candidate) ? candidate : null;
  const result = input ? computeWithholding(input) : null;
  const code = input ? encodeWithholding(input) : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      if (code) q.set("s", code); else q.delete("s");
      window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [code]);

  async function copyLink() {
    if (!code) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("s", code);
      await navigator.clipboard.writeText(url.toString());
      setCopyMessage("입력값이 담긴 링크를 복사했습니다.");
    } catch { setCopyMessage("주소창의 링크를 직접 복사해 주세요."); }
  }

  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <p className="text-xs tracking-[0.18em] text-muted">21 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">원천세 계산기</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">지급할 돈에서 세금을 얼마 떼어 두고, 상대방에게 얼마를 보내야 하는지 계산합니다. 사업소득·기타소득·일반 이자·배당을 다루며, 근로소득은 제외합니다.</p>
    <p className="mt-3 text-xs text-muted">세법 확인일 {WITHHOLDING_CONFIRMED_AT} · 세율 버전 {WITHHOLDING_RATES_VERSION} · 해당 연도 지급분 추정</p>
    {initial.linkError && <p role="alert" className="mt-6 border border-accent px-3 py-2 text-sm text-accent">{initial.linkError} — {LINK_ERROR_NEXT} 아래는 예시 입력값입니다.</p>}
    {initial.ratesChanged && <p role="alert" className="mt-6 border border-warn px-3 py-2 text-sm text-warn">공유 당시와 세율 버전이 다릅니다. 현재 확인한 세법으로 다시 계산했습니다.</p>}

    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print lg:sticky lg:top-8 lg:self-start">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <label className="block text-sm">어떤 돈을 지급하나요?
            <select className={field} value={draft.kind} onChange={(e) => { setDraft({ ...draft, kind: e.target.value as WithholdingInput["kind"], actualExpenses: "0" }); setCopyMessage(""); }}>
              {Object.entries(KIND_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          {draft.kind === "other" && <label className="block text-sm">기타소득의 세부 종류
            <select className={field} value={draft.otherCategory} onChange={(e) => setDraft({ ...draft, otherCategory: e.target.value as WithholdingInput["otherCategory"] })}>
              {Object.entries(OTHER_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>}
          <label className="block text-sm">세금을 떼기 전 지급액 (원)
            <input type="number" inputMode="numeric" min="0" max={MAX_AMOUNT} step="1" required className={`${field} num`} value={draft.gross} onChange={(e) => { setDraft({ ...draft, gross: e.target.value }); setCopyMessage(""); }} />
            <span className="mt-2 block text-xs leading-relaxed text-muted">세전 금액을 입력합니다. 기타소득은 한 계약·지급 원인별 총액을 넣어 주세요.</span>
          </label>
          {draft.kind === "other" && <label className="block text-sm">증빙할 수 있는 실제 필요경비 (원)
            <input type="number" inputMode="numeric" min="0" max={MAX_AMOUNT} step="1" required className={`${field} num`} value={draft.actualExpenses} onChange={(e) => setDraft({ ...draft, actualExpenses: e.target.value })} />
            <span className="mt-2 block text-xs leading-relaxed text-muted">정률 경비와 비교해 큰 금액을 반영합니다. 사례금에는 실제 경비만 적용합니다. 경비 인정 여부는 Josh 감수 필요입니다.</span>
          </label>}
          <label className="block text-sm">지급일
            <input type="date" min="2026-01-01" max="2026-12-31" required className={field} value={draft.paidAt} onChange={(e) => setDraft({ ...draft, paidAt: e.target.value })} />
          </label>
          <label className="block text-sm">떼어 둔 세금의 납부 방식
            <select className={field} value={draft.paymentCycle} onChange={(e) => setDraft({ ...draft, paymentCycle: e.target.value as WithholdingInput["paymentCycle"] })}>
              <option value="monthly">매월 납부</option>
              <option value="halfYearApproved">반기납부 승인·지정 받은 경우</option>
            </select>
            <span className="mt-2 block text-xs leading-relaxed text-muted">반기납부 자격은 자동으로 판정하지 않습니다.</span>
          </label>
        </form>
        <div className="mt-8 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
          <button type="button" className="text-muted underline underline-offset-4 hover:text-ink" onClick={() => { setDraft(draftOf(DEFAULT_WITHHOLDING)); setCopyMessage(""); }}>예시로 되돌리기</button>
          {code && <button type="button" onClick={copyLink} className="text-muted underline underline-offset-4 hover:text-ink">입력값 포함 링크 복사</button>}
        </div>
        <p role="status" className="mt-3 text-xs text-muted">{copyMessage}</p>
      </div>
      <div aria-live="polite">
        {input && result ? <>
          <WithholdingResult input={input} result={result} />
          <a href={`/tools/withholding/report?s=${code}`} className="no-print mt-8 inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a>
        </> : <p role="alert" className="border-t border-ink pt-6 text-sm leading-relaxed text-accent">금액은 입력 가능한 범위의 음수가 아닌 원 단위 정수로, 실제 경비는 지급액 이하로 입력해 주세요. 지급일은 세법을 확인한 해당 연도 안의 날짜여야 합니다. 빈칸을 채우면 결과를 계산합니다.</p>}
      </div>
    </div>
  </main>;
}
