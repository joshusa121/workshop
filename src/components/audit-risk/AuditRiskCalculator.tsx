"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeAuditRisk } from "@/lib/tax/audit-risk/engine";
import { auditRiskInputErrors, DEFAULT_AUDIT_RISK_INPUT, SAMPLE_AUDIT_RISK_INPUT, type AuditRiskInput } from "@/lib/tax/audit-risk/input";
import { decodeAuditRisk, encodeAuditRisk } from "@/lib/tax/audit-risk/share";
import { AUDIT_RISK_RATES_VERSION } from "@/lib/tax/audit-risk/version";
import { AuditRiskResult } from "./AuditRiskResult";

const fieldClass = "mt-2 w-full border border-line bg-paper px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ink";
function NumberField({ label, value, onChange, hint, percent = false }: { label: string; value: number; onChange: (n: number) => void; hint: string; percent?: boolean }) {
  return <label className="block text-sm">{label}
    <input type="number" min={0} max={percent ? 100 : 10_000_000_000_000} step={percent ? 0.01 : 1} value={Number.isNaN(value) ? "" : value} onChange={e => onChange(e.target.value === "" ? NaN : e.target.valueAsNumber)} className={`${fieldClass} num`} />
    <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>
  </label>;
}

export function AuditRiskCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => {
    const s = params.get("s");
    const d = s !== null ? decodeAuditRisk(s) : null;
    return { input: d?.ok ? d.input : DEFAULT_AUDIT_RISK_INPUT, error: d && !d.ok ? d.reason : null, changed: d?.ok ? d.ratesChanged : false };
  });
  const [input, setInput] = useState<AuditRiskInput>(initial.input);
  const [message, setMessage] = useState("");
  const errors = auditRiskInputErrors(input);
  const result = useMemo(() => auditRiskInputErrors(input).length ? null : computeAuditRisk(input), [input]);
  const encoded = result ? encodeAuditRisk(input) : null;
  const set = <K extends keyof AuditRiskInput>(key: K, value: AuditRiskInput[K]) => { setInput(p => ({ ...p, [key]: value })); setMessage(""); };
  async function copyLink() {
    if (!encoded) return;
    const url = new URL(window.location.href); url.search = ""; url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url);
    try { await navigator.clipboard.writeText(url.href); setMessage("입력값을 담은 링크를 복사했습니다."); }
    catch { setMessage("주소창에 입력값을 담았습니다. 주소를 직접 복사해 주세요."); }
  }
  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <p className="text-xs tracking-[0.18em] text-muted">16 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">세무조사 리스크 체크</h1>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">현금 매출과 비용 처리에서 다시 볼 항목을 골라봅니다. 장부·신고자료를 준비해 세무사와 확인할 때 쓰는 점검표입니다.</p>
    <p className="mt-3 text-xs text-muted">작업실 · 작성일 {new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })} · 세율 버전 {AUDIT_RISK_RATES_VERSION}</p>
    {initial.error && <p role="alert" className="mt-6 border border-accent p-3 text-sm text-accent">{initial.error} — {LINK_ERROR_NEXT}</p>}
    {initial.changed && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">세율·검토 기준 버전이 바뀌어 현재 기준으로 다시 계산했습니다.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print min-w-0 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <form onSubmit={e => e.preventDefault()} className="space-y-8">
          <fieldset><legend className="text-lg">장부의 같은 기간으로 입력</legend>
            <p className="mt-2 text-xs leading-relaxed text-muted">금액을 모르면 장부에서 먼저 확인하세요. 해당 사항이 없는 항목에는 0을 넣습니다. 예시는 가상의 값입니다.</p>
            <label className="mt-4 block text-sm">사업자 구분<select className={fieldClass} value={input.entity} onChange={e => { setInput(p => ({ ...p, entity: e.target.value as AuditRiskInput["entity"], ownerAdvance: 0 })); setMessage(""); }}><option value="individual">개인사업자</option><option value="corporation">법인사업자</option></select></label>
            <div className="mt-4 space-y-5">
              <NumberField label="총수입금액 (원)" value={input.annualRevenue} onChange={n => set("annualRevenue", n)} hint="해당 기간 장부의 총수입금액입니다." />
              <NumberField label="장부에 반영한 경비 총액 (원)" value={input.totalExpenses} onChange={n => set("totalExpenses", n)} hint="세무조정 전 장부에 비용으로 반영한 총액. 아래 비중과 금액의 기준입니다." />
            </div>
          </fieldset>
          <fieldset><legend className="text-lg">수입과 비용의 확인할 지점</legend><div className="mt-4 space-y-5">
            <NumberField label="현금수입 비중 (%)" value={input.cashRevenuePercent} onChange={n => set("cashRevenuePercent", n)} percent hint="총수입금액 중 현금으로 받은 비율. 현금수입 자체가 위법은 아닙니다." />
            <NumberField label="가공경비 의심 비중 (%)" value={input.suspectedFakeExpensePercent} onChange={n => set("suspectedFakeExpensePercent", n)} percent hint="경비 총액 중 실제 거래가 없다고 의심하는 비율입니다. 단순 증빙 누락과 구분하세요." />
            {input.entity === "corporation" && <NumberField label="대표 가지급금 기말 잔액 (원)" value={input.ownerAdvance} onChange={n => set("ownerAdvance", n)} hint="대표에게 지급한 돈 중 용도·정산·대여 여부를 확인할 기말 잔액입니다." />}
            <NumberField label="접대비 한도초과액 (원)" value={input.entertainmentExcess} onChange={n => set("entertainmentExcess", n)} hint="기업업무추진비(접대비) 중 한도를 넘는다고 확인한 금액. 총지출액을 넣는 칸이 아닙니다. 한도 계산은 Josh 감수 필요." />
            <NumberField label="무자료 매입액 (원)" value={input.undocumentedPurchases} onChange={n => set("undocumentedPurchases", n)} hint="장부 경비에 포함된 매입 중 세금계산서 등 거래 증빙을 확보하지 못한 금액. 법정 수취 예외는 별도로 확인합니다." />
          </div></fieldset>
          <fieldset><legend className="text-lg">신고와 확인서 제출</legend>
            <p className="mt-2 text-xs leading-relaxed text-muted">본인에게 적용되는 신고·첨부서류·성실신고확인서 등의 의무와 이행 여부를 확인했나요? 대상인지 모르면 미확인을 선택하세요.</p>
            <label className="mt-4 block text-sm">확인 상태<select className={fieldClass} value={input.compliance} onChange={e => set("compliance", e.target.value as AuditRiskInput["compliance"])}><option value="unknown">의무 또는 이행 여부 미확인</option><option value="met">적용되는 의무 이행 확인</option><option value="unmet">미이행 항목 있음</option></select></label>
          </fieldset>
        </form>
        <div className="mt-6 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
          <button type="button" onClick={() => { setInput(SAMPLE_AUDIT_RISK_INPUT); setMessage("가상 법인 예시를 불러왔습니다. 본인 장부의 값으로 바꿔 주세요."); }} className="underline underline-offset-4">가상 예시 불러오기</button>
          <button type="button" onClick={() => { setInput(DEFAULT_AUDIT_RISK_INPUT); setMessage(""); }} className="text-muted underline underline-offset-4">입력 초기화</button>
          {encoded && <button type="button" onClick={copyLink} className="underline underline-offset-4">입력값 포함 링크 복사</button>}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">공유 링크에는 입력한 재무 수치가 그대로 담깁니다. 공유 범위를 확인해 주세요.</p>
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </div>
      <div aria-live="polite" className="min-w-0">
        {result ? <><AuditRiskResult input={input} result={result} /><div className="no-print mt-10 border-t border-line pt-6"><a href={`/tools/audit-risk/report?s=${encoded}`} className="inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a></div></> : <div className="border-t border-ink pt-6 text-sm leading-relaxed">
          <h2 className="text-xl">장부의 값을 넣으면 점검표가 나옵니다</h2>
          <p className="mt-3 text-muted">모르는 값은 자동으로 0으로 보지 않습니다. 가상 예시로 표시 방식을 먼저 살펴볼 수 있습니다.</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">{errors.map(e => <li key={e}>{e}</li>)}</ul>
        </div>}
      </div>
    </div>
  </main>;
}
