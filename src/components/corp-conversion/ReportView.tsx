"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DISCLAIMER } from "@/lib/catalog";
import { EMPTY_SCENARIO } from "@/lib/default-scenario";
import { decodeScenario } from "@/lib/share-codec";
import { resolveAssumptions } from "@/lib/tax/assumptions";
import { runCorporate, runIndividual } from "@/lib/tax/scenario";
import { RATES_VERSION } from "@/lib/tax/sources";
import { formatWon } from "@/lib/won";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { type CompareAxis } from "./BreakEvenChart";
import { MethodPanel } from "./MethodPanel";
import { ResultCompare } from "./ResultCompare";
import { SummaryCard } from "./SummaryCard";
import { TimingPanel } from "./TimingPanel";
import { LINK_ERROR_NEXT } from "@/lib/link-error";

export function ReportView() {
  const searchParams = useSearchParams();
  const [axis, setAxis] = useState<CompareAxis>("combinedNetWorth");
  const decoded = searchParams.get("s") ? decodeScenario(searchParams.get("s") ?? "") : null;
  const input = decoded && decoded.ok ? decoded.input : EMPTY_SCENARIO;
  const a = resolveAssumptions(input.overrides);
  const indiv = runIndividual(input, a);
  const corp = runCorporate(input, a);

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

      {decoded && !decoded.ok && (
        <p className="mb-6 text-sm text-accent">{decoded.reason} — {LINK_ERROR_NEXT}</p>
      )}

      <h1 className="text-2xl font-medium">법인전환 검토보고서</h1>
      <p className="mt-2 text-xs text-muted">세율 버전 {RATES_VERSION} · 참고용 시뮬레이션</p>

      <section className="mt-10">
        <h2 className="text-lg">1. 검토 개요</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>매출 {formatWon(input.revenue)}</div>
          <div>이익(세무조정 전) {formatWon(input.accountingProfit)}</div>
          <div>업종군 {input.industryGroup}</div>
          <div>소재지 {input.workplace.sido}</div>
          <div>자산 {formatWon(input.assets.total)}</div>
          <div>부채 {formatWon(input.liabilities)}</div>
          <div>대표 급여 {formatWon(input.ownerSalary)}</div>
          <div>연 배당액 {formatWon(input.dividendAmount)}</div>
          {input.familyWorkers > 0 && <div>가족 근무자 {input.familyWorkers}명 × {formatWon(input.familySalaryEach)}</div>}
          {input.retirementPlan && <div>정관 퇴직급여 배수 {input.retirementMultiple}배</div>}
        </dl>
      </section>

      <SummaryCard input={input} indiv={indiv} corp={corp} />

      <section className="mt-10">
        <h2 className="text-lg">2. 시기 판정</h2>
        <TimingPanel input={input} showTitle={false} />
      </section>

      <section className="mt-4">
        <h2 className="text-lg">3. 세부담 시뮬레이션</h2>
        <ResultCompare
          input={input}
          indiv={indiv}
          corp={corp}
          axis={axis}
          onAxis={setAxis}
          onSalary={() => undefined}
          onDividend={() => undefined}
          interactive={false}
        />
      </section>

      <section className="mt-4">
        <h2 className="text-lg">4. 전환 방법 검토</h2>
        <MethodPanel input={input} showTitle={false} />
      </section>

      <section className="mt-14">
        <h2 className="text-lg">5. 실행 로드맵 · 전문가 확인사항</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>성실신고 대상에 들어가기 전과 후 중 어느 쪽에 전환 시점을 둘지 정합니다.</li>
          <li>자본금이 순자산가액 이상인지, 주택 자산이 있는지 확인합니다.</li>
          <li>포괄양수도 부가세·고용승계·감정평가는 세무사·법무사와 함께 봅니다.</li>
          <li>등록면허세·취득세는 본세만 추정(취득세분 지방교육세·농특세 미반영). 대도시 중과와 감면의 결합, 세금을 매기는 기준 금액(과세표준)은 세무사 확인.</li>
          <li>가족 급여를 넣었다면 근무 사실 증빙(출근·업무·근무시간)을 갖춥니다.</li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">6. 전제와 한계</h2>
        <AssumptionsPanel value={input.overrides ?? {}} onChange={() => undefined} readOnly />
        <p className="mt-8 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
      </section>
    </article>
  );
}
