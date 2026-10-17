"use client";

import {
  ASSUMPTION_BASIS,
  DEFAULT_ASSUMPTIONS,
  type Assumptions,
} from "@/lib/tax/assumptions";
import { LOSS_CARRYFORWARD_NOTE } from "@/lib/tax/scenario";
import { formatWon } from "@/lib/won";

const LABELS: Record<keyof Assumptions, string> = {
  bookkeepingMonthlyCorp: "법인 월 기장료",
  bookkeepingAdjustmentCorp: "법인 조정·신고료",
  bookkeepingMonthlyIndivDouble: "개인 복식 월 기장료",
  bookkeepingAdjustmentIndivDouble: "개인 복식 조정료",
  bookkeepingMonthlyIndivSimple: "개인 간편 월 기장료",
  bookkeepingAdjustmentIndivSimple: "개인 간편 조정료",
  incorporationSideCost: "설립 부대비용",
  retirementServiceYears: "퇴직 경로 근속연수(년)",
  appraisalCost: "감정평가 비용",
  inKindContributionLegalCost: "현물출자 법원 절차·법무 비용",
  sincereConfirmCost: "성실신고확인비용 기본값",
};

export function AssumptionsPanel({
  value,
  onChange,
  readOnly = false,
}: {
  value: Partial<Assumptions>;
  onChange: (next: Partial<Assumptions>) => void;
  readOnly?: boolean;
}) {
  const keys = Object.keys(DEFAULT_ASSUMPTIONS) as (keyof Assumptions)[];

  return (
    <section className="mt-14">
      <h2 className="text-xl">전제</h2>
      <p className="mt-2 text-sm text-muted">
        법령값이 아닙니다. 고치면 위 비교가 다시 계산됩니다.
      </p>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {keys.map((key) => {
          const current = value[key] ?? DEFAULT_ASSUMPTIONS[key];
          const changed = value[key] !== undefined && value[key] !== DEFAULT_ASSUMPTIONS[key];
          const basis = ASSUMPTION_BASIS[key];
          return (
            <li key={key} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm">
                  {LABELS[key]}
                  {changed && <span className="ml-2 text-xs text-accent">수정됨</span>}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {basis.kind === "assumption" ? basis.description : ""} · 기본{" "}
                  {key === "retirementServiceYears" ? `${DEFAULT_ASSUMPTIONS[key]}년` : formatWon(DEFAULT_ASSUMPTIONS[key])}
                </p>
              </div>
              <label className="num flex items-center gap-2 text-sm">
                <input
                  type="number"
                  className="w-36 border-0 border-b border-ink bg-transparent py-1 text-right"
                  value={current}
                  readOnly={readOnly}
                  onChange={(e) => {
                    if (readOnly) return;
                    const n = Number(e.target.value);
                    onChange({
                      ...value,
                      [key]: Number.isFinite(n) ? n : DEFAULT_ASSUMPTIONS[key],
                    });
                  }}
                />
                {key === "retirementServiceYears" ? "년" : "원"}
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted">법인 비용이 이익보다 크면 그 적자만큼 회사 현금이 줄어든 것으로 계산합니다. {LOSS_CARRYFORWARD_NOTE}.</p>
      <div className="mt-8">
        <h3 className="text-sm">이 계산기가 다루지 않는 것</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
          {NOT_COVERED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** 미반영 항목 — final-audit §6·§7 기준 (Josh 2026-09-26 R5) */
const NOT_COVERED = [
  "최저한세(조특법 §132) — 창업감면·노란우산공제가 큰 저소득 사례에서만 결과가 달라질 수 있습니다.",
  "농어촌특별세(취득세분)·취득세분 지방교육세",
  "지역건보 재산보험료 — 점수 환산표가 없어 소득분만 계산합니다.",
  "직장건보 보수월액 상·하한, 보수 외 소득월액 상한·2년 시차",
  "본인 외 인적공제·특별세액공제(배우자·부양가족 등)",
  "대도시 중과 제외 업종, 자기주식·감자, 전년도 적자의 이월 공제(이월결손금)",
  "부동산임대업 노란우산공제 비율 축소",
];
