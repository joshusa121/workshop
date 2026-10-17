"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { DISCLAIMER } from "@/lib/catalog";
import { formatWon } from "@/lib/won";
import { traced } from "@/lib/tax/trace";
import { computeSincereFiling } from "@/lib/tax/sincere-filing/engine";
import { DEFAULT_INPUT, MAX_AMOUNT, validateInput, type SincereInput, type RevenueGroups } from "@/lib/tax/sincere-filing/input";
import { GROUP_DETAILS, GROUP_LABELS, SINCERE_BASIS, SINCERE_THRESHOLDS } from "@/lib/tax/sincere-filing/rates-sincere";
import { decodeSincere, encodeSincere } from "@/lib/tax/sincere-filing/share";
import { SincereNumber } from "./SincereNumber";
import { SincereResult } from "./SincereResult";

const blank = (): SincereInput => ({ ...DEFAULT_INPUT, current: [NaN, NaN, NaN], previous: [NaN, NaN, NaN] });
const yearBasis = { kind: "assumption" as const, description: "2026년 귀속만 지원하는 계산기 범위", editable: true as const };
export function SincereCalculator() {
  const params = useSearchParams();
  const code = params.get("s");
  const decoded = code ? decodeSincere(code) : null;
  const [input, setInput] = useState<SincereInput>(() => decoded?.ok ? decoded.input : blank());
  const [copyMessage, setCopyMessage] = useState("");
  const [linkDismissed, setLinkDismissed] = useState(false);
  const errors = validateInput(input);
  const result = errors.length ? null : computeSincereFiling(input);
  function update(patch: Partial<SincereInput>) {
    setInput(i => ({ ...i, ...patch }));
    setCopyMessage("");
  }
  function amount(period: "current" | "previous", n: number, raw: string) {
    const values: RevenueGroups = [...input[period]];
    values[n] = raw.trim() === "" ? NaN : Number(raw);
    update({ [period]: values });
  }
  async function copyLink() {
    if (!result) return;
    const url = new URL("/tools/sincere-filing", window.location.origin);
    url.searchParams.set("s", encodeSincere(input));
    window.history.replaceState(null, "", url);
    try { await navigator.clipboard.writeText(url.toString()); setCopyMessage("링크 복사됨"); }
    catch { setCopyMessage("복사하지 못했습니다. 주소창의 링크를 복사해 주세요."); }
  }
  const field = "num mt-2 w-full min-w-0 border border-line bg-paper px-2 py-2 text-right text-sm outline-offset-2 focus:outline focus:outline-ink";
  return (
    <main className="mx-auto max-w-6xl break-keep px-5 py-10 text-pretty sm:py-16">
      <header className="max-w-3xl">
        <p className="text-xs text-muted">13 / 연재</p>
        <h1 className="mt-3 text-balance text-3xl sm:text-4xl">성실신고확인 대상일까요?</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted"><SincereNumber align="left" t={traced("지원 귀속연도", input.year, ["현재 지원하는 귀속연도"], [yearBasis])}>2026년</SincereNumber> 개인사업자의 업종별 수입으로 판정합니다. 장부를 세무사에게 확인받아야 하는지, 장부 작성 의무는 무엇인지 함께 봅니다.</p>
      </header>
      {decoded && !decoded.ok && !linkDismissed && <div role="alert" className="mt-6 border-l-2 border-accent pl-4 text-sm text-accent">{decoded.reason} — {LINK_ERROR_NEXT}<button onClick={() => setLinkDismissed(true)} type="button" className="ml-4 underline">직접 입력하기</button></div>}
      {decoded?.ok && decoded.ratesChanged && <p role="status" className="mt-6 text-sm text-warn">공유 링크의 세율 버전이 다릅니다. 현재 확인된 기준으로 다시 판정했습니다.</p>}
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <form onSubmit={e => e.preventDefault()}>
            <h2 className="border-t border-ink pt-5 text-xl">업종별 수입을 넣어 주세요</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">비용을 빼기 전 수입금액을 원 단위로 입력하세요. 같은 업종군의 사업장은 합산하고, 해당하지 않는 업종군에는 영(0)을 입력합니다. 사업용 유형자산 양도수입은 제외합니다.</p>
            <p className="mt-3 text-xs text-muted">해당 연도: 성실신고 판정 / 직전 연도: 복식부기 판정</p>
            {GROUP_LABELS.map((label, n) => (
              <fieldset key={label} className="mt-6 border-b border-line pb-5">
                <legend className="text-sm font-medium">{label}</legend>
                <details className="mt-2 text-xs leading-relaxed text-muted"><summary className="w-fit cursor-pointer underline underline-offset-4">업종과 기준 보기</summary><p className="mt-2">{GROUP_DETAILS[n]}</p><p className="mt-2">성실신고 기준 <SincereNumber t={traced("업종별 성실신고 기준", SINCERE_THRESHOLDS.value[n], [label], [SINCERE_BASIS])}>{formatWon(SINCERE_THRESHOLDS.value[n])}</SincereNumber></p></details>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(["current", "previous"] as const).map(period => <label key={period} className="min-w-0 text-xs text-muted" htmlFor={`${period}-${n}`}>{period === "current" ? "해당 연도 수입 (원)" : "직전 연도 수입 (원)"}<input id={`${period}-${n}`} type="number" inputMode="numeric" min="0" max={MAX_AMOUNT} step="1" value={Number.isFinite(input[period][n]) ? input[period][n] : ""} onChange={e => amount(period, n, e.target.value)} className={field} /></label>)}
                </div>
              </fieldset>
            ))}
            <fieldset className="mt-7 space-y-4 text-sm leading-relaxed">
              <legend className="mb-3 text-xl">판정에 필요한 조건</legend>
              <label className="flex items-start gap-3"><input type="checkbox" checked={input.newBusiness} onChange={e => update({ newBusiness: e.target.checked, ...(e.target.checked ? { previous: [0, 0, 0] as RevenueGroups } : {}) })} className="mt-1 accent-ink" /><span>해당 연도에 처음 사업을 시작했습니다.<small className="mt-1 block text-muted">선택하면 직전 수입을 영으로 채웁니다.</small></span></label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={input.excludedFromSimple} onChange={e => update({ excludedFromSimple: e.target.checked })} className="mt-1 accent-ink" /><span>간편장부 배제 대상임을 확인했습니다.<small className="mt-1 block text-muted">전문직·의료·약국 등은 수입이 적거나 신규라도 복식부기일 수 있습니다. 세무사에게 배제 여부를 확인한 뒤 선택하세요.</small></span></label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={input.needsReview} onChange={e => update({ needsReview: e.target.checked })} className="mt-1 accent-ink" /><span>공동사업·특수 업종이거나 업종 분류가 불명확합니다.<small className="mt-1 block text-muted">사업서비스업 특례·영세사업 별도 기준 등도 포함합니다. 선택하면 Josh 감수로 판정을 유보합니다.</small></span></label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={input.submitted} onChange={e => update({ submitted: e.target.checked })} className="mt-1 accent-ink" /><span>대상인 경우 성실신고확인서를 제출하는 전제입니다.<small className="mt-1 block text-muted">연장 신고기한과 확인비용 공제 안내에 반영합니다.</small></span></label>
            </fieldset>
            <label htmlFor="confirmation-cost" className="mt-7 block text-sm">확인에 직접 사용한 비용 (원)<input id="confirmation-cost" type="number" inputMode="numeric" min="0" max={MAX_AMOUNT} step="1" value={Number.isFinite(input.confirmationCost) ? input.confirmationCost : ""} onChange={e => update({ confirmationCost: e.target.value.trim() === "" ? NaN : Number(e.target.value) })} className={field} /></label>
          </form>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <button type="button" onClick={() => { setInput({ ...DEFAULT_INPUT, current: [900_000_000, 300_000_000, 0], previous: [150_000_000, 0, 37_500_000], submitted: true, confirmationCost: 3_000_000 }); setCopyMessage(""); }} className="underline underline-offset-4">겸업 예시 불러오기</button>
            <button type="button" onClick={() => { setInput(blank()); setCopyMessage(""); }} className="text-muted underline underline-offset-4">다시 입력</button>
            {result && <button type="button" onClick={copyLink} className="underline underline-offset-4">입력값 포함 링크 복사</button>}
          </div>
          <p role="status" className="mt-3 text-xs text-muted">{copyMessage}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted">공유 링크에는 입력한 금액이 포함됩니다. 예시 금액으로 바꾼 뒤 공유할 수 있습니다.</p>
        </div>
        <div aria-live="polite">
          {result ? <><SincereResult input={input} result={result} /><a href={`/tools/sincere-filing/report?s=${encodeSincere(input)}`} className="no-print mt-8 inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a></> : <section className="border-t border-ink pt-5"><h2 className="text-xl">업종과 수입에서 시작합니다</h2><p className="mt-4 text-sm leading-relaxed text-muted">업종군별 해당·직전 연도 수입을 모두 채우면 판정이 나옵니다. 해당하지 않는 업종군은 영으로 입력하세요. 감이 안 오면 왼쪽의 겸업 예시로 시작할 수 있습니다.</p><p role="status" className="mt-4 text-sm text-warn">{errors[0]}</p><p className="mt-8 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p></section>}
        </div>
      </div>
    </main>
  );
}
