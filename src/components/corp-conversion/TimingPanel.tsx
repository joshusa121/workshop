"use client";

import { sincereFilingStatus, sincereFilingTimeline } from "@/lib/tax/conversion/sincere-filing";
import type { ScenarioInput } from "@/lib/tax/scenario-input";
import { formatWon } from "@/lib/won";
import { TraceValue } from "./TraceValue";

export function TimingPanel({ input, showTitle = true }: { input: ScenarioInput; showTitle?: boolean }) {
  const { isTarget, threshold } = sincereFilingStatus(input.industryGroup, input.revenue);
  const history = input.revenueHistory ?? [];
  const timeline = sincereFilingTimeline(input.industryGroup, history);
  const ratio = threshold.value > 0 ? Math.min(1.2, input.revenue / threshold.value) : 0;

  return (
    <section className="mt-14">
      {showTitle && <h2 className="text-xl">시기 판정</h2>}
      <p className="mt-2 text-sm text-muted">
        성실신고확인대상은 업종군 수입금액 기준입니다. 이익이 아닙니다.
      </p>

      <div className="mt-6">
        <div className="flex justify-between text-xs text-muted">
          <span>올해 매출 {formatWon(input.revenue)}</span>
          <span>
            기준 <TraceValue t={threshold} />
          </span>
        </div>
        <div className="mt-2 h-2 bg-line">
          <div
            className="h-2 bg-ink"
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </div>
        <p className="mt-3 text-sm">
          {isTarget
            ? "이미 기준 이상입니다. 대상에 들어간 뒤 전환하면 확인비용·신고 부담이 개인에 남습니다."
            : "아직 기준 아래입니다. 대상에 들어가기 전에 전환하면 그해부터 법인 쪽으로 봅니다."}
        </p>
        <p className="mt-2 text-sm text-muted">
          진입 예상 연도: {timeline.expectedYear ?? "미확인"} · {timeline.note}
        </p>
        {isTarget && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-warn">
            지금 성실신고 대상이라면 법인으로 바꿔도 3년 동안은 법인도 같은 확인을 받습니다. 전환으로 성실신고를 피할 수는 없습니다.
          </p>
        )}
        {isTarget && input.sincereFilingConfirmCost === 0 && (
          <p className="mt-2 text-sm text-muted">
            확인비용은 직접 입력이 없어 전제값 150만 원(연)을 개인·법인 양쪽에 적용했습니다. 전제 패널에서 고칠 수 있습니다.
          </p>
        )}
      </div>
    </section>
  );
}
