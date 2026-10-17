"use client";

import type { ReactNode } from "react";
import { DISCLAIMER } from "@/lib/catalog";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { traced } from "@/lib/tax/trace";
import type { StartupReliefResult as Result } from "@/lib/tax/startup-relief/engine";
import { INDUSTRIES, REGIONS, STARTUP_KINDS, type StartupReliefInput } from "@/lib/tax/startup-relief/input";
import { STARTUP_BASIS } from "@/lib/tax/startup-relief/rates-startup";
import { TraceNumber } from "./TraceNumber";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b border-line py-3 text-sm"><dt className="text-muted">{label}</dt><dd className="min-w-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0">{children}</dd></div>;
}

export function StartupReliefResult({ input, result: r }: { input: StartupReliefInput; result: Result }) {
  const title = r.status === "review" ? "Josh 감수 필요" : r.status === "eligible" ? "입력한 요건으로 감면 대상입니다" : "이 계산의 감면 적용 대상이 아닙니다";
  return (
    <div className="min-w-0 break-keep text-pretty">
      <div className="border-b border-ink pb-6">
        <p className="text-sm text-muted">판정 · 일반 창업 감면</p>
        <h2 className={`mt-2 text-balance text-2xl ${r.status === "review" ? "text-warn" : r.status === "eligible" ? "text-ok" : "text-ink"}`}>{title}</h2>
        {r.relief ? <>
          <div className="num mt-5 text-4xl [&_[role=dialog]]:font-sans [&_[role=dialog]]:text-xs"><TraceValue t={r.relief} /></div>
          <p className="mt-3 text-sm leading-relaxed text-muted">최저한세 등을 반영하기 전의 감면액입니다. 실제 낼 세금은 별도로 검토해야 합니다.</p>
        </> : <p className="mt-4 text-sm leading-relaxed text-muted">확인되지 않은 요건이 있어 감면율과 감면액을 확정하지 않았습니다. 아래 항목을 확인해 주세요.</p>}
      </div>

      <section className="mt-8">
        <h3 className="text-lg">판정의 이유</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">{r.reasons.map(s => <li key={s}>{s}</li>)}</ol>
      </section>

      {r.rate && <section className="mt-10">
        <h3 className="text-xl">감면액이 나오는 과정</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">밑줄 친 숫자를 누르면 계산 과정과 근거 조문을 볼 수 있습니다.</p>
        <dl className="mt-4 border-t border-ink">
          <Row label="대상 사업의 국세 산출세액"><TraceValue t={r.eligibleTax} /></Row>
          <Row label="연간으로 환산한 수입금액"><TraceValue t={r.annualRevenue} /></Row>
          <Row label="적용 감면율"><TraceNumber t={r.rate} unit="percent" /></Row>
          {r.beforeCap && <Row label="한도 적용 전 감면액"><TraceValue t={r.beforeCap} /></Row>}
          <Row label="과세연도별 감면 합계 한도"><TraceValue t={r.cap} /></Row>
          {r.relief && <Row label="최저한세 등 반영 전 감면액"><TraceValue t={r.relief} /></Row>}
        </dl>
        {r.lowRevenueApplied && <p className="mt-3 text-xs leading-relaxed text-muted">청년 외 창업기업의 수입금액 특례를 적용했습니다. 수입금액은 비용을 빼기 전 금액입니다.</p>}
      </section>}

      {r.periodStart && r.periodEnd && <section className="relative mt-10 [&_details]:static">
        <h3 className="text-xl">감면기간</h3>
        <p className="mt-2 flex flex-wrap items-baseline gap-2 text-sm"><TraceNumber t={r.periodStart} unit="year" /><span>부터</span><TraceNumber t={r.periodEnd} unit="year" /><span>까지</span></p>
        <div className="mt-5 flex border-t border-ink pt-3" aria-label="감면기간의 과세연도">
          {Array.from({ length: 5 }, (_, index) => {
            const year = r.periodStart!.value + index;
            const t = traced("감면기간에 포함되는 과세연도", year, ["감면 시작 과세연도부터 순서대로 표시"], [STARTUP_BASIS.period]);
            return <div key={year} className={`flex-1 border-l border-line px-1 text-center ${year === input.taxYear ? "font-semibold text-accent" : "text-muted"}`}><TraceNumber t={t} unit="year" /></div>;
          })}
        </div>
        {input.firstIncomeYear === null && <p className="mt-3 text-sm text-warn">무소득이 계속될 때의 예정 기간입니다. 그 전에 소득이 생기면 시작·종료 연도가 앞당겨집니다.</p>}
      </section>}

      <section className="mt-10">
        <h3 className="text-xl">입력한 전제</h3>
        <dl className="mt-4 border-t border-ink">
          {!r.rate && Number.isSafeInteger(input.eligibleTax) && Number.isSafeInteger(input.annualRevenue) && <>
            <Row label="입력 국세 산출세액"><TraceValue t={r.eligibleTax} /></Row>
            <Row label="입력 연환산 수입금액"><TraceValue t={r.annualRevenue} /></Row>
          </>}
          <Row label="창업일">{input.startupDate || "미입력"}</Row>
          <Row label="계산 과세연도"><TraceNumber t={traced("계산 과세연도", input.taxYear, ["사용자 입력"], [{ kind: "assumption", description: "해당 연도는 사용자가 선택", editable: true }])} unit="year" /></Row>
          <Row label="최초 소득 발생 과세연도">{input.firstIncomeYear === null ? "아직 소득 없음" : <TraceNumber t={traced("최초 소득 발생 과세연도", input.firstIncomeYear, ["사용자 입력, 매출이 아닌 과세소득 발생 기준"], [STARTUP_BASIS.period])} unit="year" />}</Row>
          <Row label="창업 지역">{REGIONS[input.region]}</Row>
          <Row label="사업 형태">{STARTUP_KINDS[input.startupKind]}</Row>
          <Row label="대상 업종">{INDUSTRIES[input.industry]}</Row>
          <Row label="중소기업 요건">{{ yes: "충족 확인", no: "미충족", unknown: "미확인" }[input.sme]}</Row>
          <Row label="청년 대표자 요건">{{ yes: "충족 확인", no: "청년 외", unknown: "미확인" }[input.youth]}</Row>
          <Row label="이전·지분 변경 등 특수사례">{input.specialCase ? "있음 (Josh 감수)" : "없다는 전제"}</Row>
        </dl>
      </section>

      <section className="mt-10 text-sm leading-relaxed">
        <h3 className="text-xl">전제와 미반영</h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">{r.notes.map(n => <li key={n}>{n}</li>)}</ul>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
