"use client";

import Link from "next/link";
import { isGoodwillCandidate } from "@/lib/tax/conversion/method";
import { sincereFilingStatus } from "@/lib/tax/conversion/sincere-filing";
import { assessCutoff, type CutoffVerdict } from "@/lib/tax/cutoff";
import { explainCompare } from "@/lib/tax/explain";
import type { ScenarioResult } from "@/lib/tax/scenario";
import type { ScenarioInput } from "@/lib/tax/scenario-input";
import { TraceValue } from "./TraceValue";

const NEXT_ACTION: Record<CutoffVerdict, string> = {
  "아직 아님": "지금은 개인으로 유지합니다. 이익이 1억 원을 넘거나 성실신고 기준에 가까워지면 다시 봅니다.",
  "검토 구간": "세무사와 전환 시기와 방법을 상담할 단계입니다. 아래 표에서 급여·배당을 바꿔 보며 감을 잡습니다.",
  "적극 검토": "올해 안에 전환 방법과 자본금을 정하고 실행 계획을 세웁니다. 아래 전환 방법 순위를 참고합니다.",
};

const VERDICT_TONE: Record<CutoffVerdict, string> = {
  "아직 아님": "text-muted",
  "검토 구간": "text-ink",
  "적극 검토": "text-accent",
};

export const NON_TAX_CARD_TEXT =
  "이 이익 규모에서는 세금만으로는 전환 실익이 작습니다. 다만 금융기관 신용도, 법인 거래를 요구하는 거래처, 입찰·인증 요건, 대표 개인 재산과 회사 책임의 분리가 필요하다면 세금과 별개로 검토합니다.";

/** 결과 화면 최상단 「쉬운 설명 3줄」 — 고정 카드 (모달 아님) */
export function SummaryCard({
  input,
  indiv,
  corp,
  includeFamily = false,
}: {
  input: ScenarioInput;
  indiv: ScenarioResult;
  corp: ScenarioResult;
  /** 「가족 실수령 포함해서 보기」 토글 (화면 상태, 공유 URL 미포함) */
  includeFamily?: boolean;
}) {
  const cutoff = assessCutoff(input);
  const lines = explainCompare(indiv, corp, includeFamily);
  const goodwill = isGoodwillCandidate(input);
  const sincereTarget = sincereFilingStatus(input.industryGroup, input.revenue).isTarget;

  return (
    <section className="mt-12 border-y border-ink py-6" aria-labelledby="summary-heading">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p id="summary-heading" className="text-xs tracking-[0.18em] text-muted">
            쉬운 설명 3줄
          </p>
          <ol className="mt-3 space-y-2 text-base leading-relaxed">
            <li>
              <span className="mr-2 text-xs text-muted">1</span>
              지금 법인 전환은{" "}
              <strong className={`font-medium ${VERDICT_TONE[cutoff.verdict]}`}>「{cutoff.verdict}」</strong>
              입니다. 기준이 된 사업소득금액 <TraceValue t={cutoff.base} />
              {cutoff.upgradedBy.length > 0 && (
                <span className="ml-1 text-sm text-muted">· 고려한 사정: {cutoff.upgradedBy.join(", ")}</span>
              )}
            </li>
            <li>
              <span className="mr-2 text-xs text-muted">2</span>
              {lines[1]}
            </li>
            <li>
              <span className="mr-2 text-xs text-muted">3</span>
              {NEXT_ACTION[cutoff.verdict]}
            </li>
          </ol>
          {sincereTarget && (
            <p className="mt-4 text-sm leading-relaxed text-warn">
              지금 성실신고 대상이라면 법인으로 바꿔도 3년 동안은 법인도 같은 확인을 받습니다. 전환으로 성실신고를 피할 수는 없습니다.
            </p>
          )}
          {goodwill && (
            <p className="mt-4 text-sm">
              <span className="border border-ink px-1.5 py-0.5 text-xs">영업권 양도 검토 대상</span>
              <span className="ml-2 text-muted">
                이익이 순자산 대비 크면 영업권을 따로 넘기는 방법을 봅니다 —{" "}
                <Link href="/tools/goodwill" className="underline decoration-dotted underline-offset-4 text-ink hover:text-accent">
                  영업권 계산기(2화)
                </Link>
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          data-todo="예약 URL"
          className="cursor-not-allowed border border-line px-4 py-2 text-sm text-muted print:hidden"
          title="예약 링크 준비 중"
        >
          상담 예약 (준비 중)
        </button>
      </div>

      {cutoff.showNonTaxCard && (
        <div className="mt-6 border-l-2 border-warn pl-4 text-sm leading-relaxed">
          <p className="text-xs text-warn">비세금 요인</p>
          <p className="mt-1">{NON_TAX_CARD_TEXT}</p>
        </div>
      )}
    </section>
  );
}
