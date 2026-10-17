"use client";

import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { AuditRiskInput } from "@/lib/tax/audit-risk/input";
import type { AuditRiskResult as Result } from "@/lib/tax/audit-risk/engine";
import { LAW_BASES } from "@/lib/tax/audit-risk/rates";
import { AuditTrace } from "./AuditTrace";

const LEVELS = {
  priority: { label: "우선 검토", description: "거래 사실이나 의무 이행부터 확인할 징후가 있습니다.", tone: "text-accent" },
  review: { label: "자료 점검", description: "장부와 신고자료를 대조할 항목이 있습니다.", tone: "text-warn" },
  incomplete: { label: "확인 보류", description: "신고·확인서 의무 이행 여부가 아직 확인되지 않았습니다.", tone: "text-warn" },
  "no-signals": { label: "입력상 징후 없음", description: "입력한 범위에서 점검 징후가 없습니다. 조사 가능성이 없다는 뜻은 아닙니다.", tone: "text-ink" },
};
const STATES = { priority: "우선 검토", review: "자료 점검", unknown: "미확인", clear: "입력상 없음", excluded: "개인 적용 제외" };
const COMPLIANCE = { met: "적용되는 의무 이행 확인", unmet: "미이행 항목 있음", unknown: "의무 또는 이행 여부 미확인" };

export function AuditRiskResult({ input, result: r }: { input: AuditRiskInput; result: Result }) {
  const level = LEVELS[r.level];
  return <div className="min-w-0 break-keep text-pretty">
    <header className="border-b border-ink pb-6">
      <p className="text-sm text-muted">세무검증 리스크 · 검토 우선순위</p>
      <h2 className={`mt-2 text-balance text-3xl ${level.tone}`}>{level.label}</h2>
      <p className="mt-3 text-sm leading-relaxed">{level.description}</p>
      <p className="mt-3 text-sm font-medium">전문가 확인 · Josh 감수 필요</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">조사 대상 여부를 판정하지 않습니다. 아래 개수는 체크리스트 집계이며 법정 점수나 확률이 아닙니다.</p>
    </header>
    <dl className="mt-4 text-sm">
      {[["점검 징후", r.flaggedCount], ["그중 우선 검토", r.priorityCount], ["미확인", r.unknownCount], ["적용 항목", r.applicableCount]].map(([label, t]) => <div key={label as string} className="flex justify-between gap-4 border-b border-line py-2.5"><dt>{label as string}</dt><dd><AuditTrace t={t as Result["flaggedCount"]} unit="개" /></dd></div>)}
    </dl>

    <section className="mt-10">
      <h2 className="text-xl">어떤 자료를 먼저 볼까요</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">징후가 있는 항목도 실제 위반으로 확정된 것은 아닙니다.</p>
      <div className="mt-4 border-t border-ink">{r.checks.map(c => <article key={c.id} className="border-b border-line py-5 print:break-inside-avoid">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-medium">{c.label}</h3><p className={`text-xs ${c.state === "priority" ? "text-accent" : c.state === "review" || c.state === "unknown" ? "text-warn" : "text-muted"}`}>{STATES[c.state]}</p></div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.reason}</p>
        {c.state !== "excluded" && <p className="mt-2 text-sm leading-relaxed">확인할 자료: {c.action}</p>}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{c.basis.map((b, index) => b.kind === "law" && <a key={index} href={b.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{b.law} {b.article}</a>)}</div>
      </article>)}</div>
    </section>

    <section className="mt-10">
      <h2 className="text-xl">입력과 금액 확인</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">밑줄 친 숫자를 누르면 입력 전제·계산 과정·근거를 확인할 수 있습니다. 서로 겹치는 비용은 합산하지 않습니다.</p>
      <dl className="mt-4 border-t border-ink text-sm">
        <div className="flex justify-between gap-4 border-b border-line py-3"><dt>사업자 구분</dt><dd>{input.entity === "individual" ? "개인사업자" : "법인사업자"}</dd></div>
        <div className="flex flex-wrap justify-between gap-3 border-b border-line py-3"><dt>신고·확인서 제출</dt><dd>{COMPLIANCE[input.compliance]}</dd></div>
        {[["총수입금액", r.annualRevenue], ["장부 경비 총액", r.totalExpenses], ["현금수입 환산액", r.cashRevenue], ["가공경비 의심 환산액", r.suspectedFakeExpenses], ...(input.entity === "corporation" ? [["대표 가지급금 기말 잔액", r.ownerAdvance]] : []), ["기업업무추진비 한도초과액", r.entertainmentExcess], ["무자료 매입액", r.undocumentedPurchases]].map(([label, t]) => <div key={label as string} className="flex items-baseline justify-between gap-3 border-b border-line py-3"><dt>{label as string}</dt><dd className="shrink-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0"><TraceValue t={t as Result["annualRevenue"]} /></dd></div>)}
        <div className="flex justify-between gap-4 border-b border-line py-3"><dt>현금수입 비중</dt><dd><AuditTrace t={r.cashPercent} unit="%" /></dd></div>
        <div className="flex justify-between gap-4 border-b border-line py-3"><dt>가공경비 의심 비중</dt><dd><AuditTrace t={r.fakePercent} unit="%" /></dd></div>
      </dl>
    </section>

    <section className="mt-10 text-sm leading-relaxed">
      <h2 className="text-xl">전제와 미반영</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">{r.notes.map(n => <li key={n}>{n}</li>)}</ul>
      <p className="mt-5">조사가 시작된다면</p>
      <p className="mt-2 text-muted">납세자권리헌장의 교부와 사전통지·연기신청에 관한 규정도 함께 확인하세요. 사전통지에는 예외가 있으므로 실제 통지서와 상황은 전문가 확인이 필요합니다.</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">{[LAW_BASES.rights, LAW_BASES.notice].map(b => b.kind === "law" && <a key={b.url} href={b.url} target="_blank" rel="noreferrer" className="underline">{b.law} {b.article}</a>)}</div>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
    </section>
  </div>;
}
