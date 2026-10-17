import { describe, expect, it } from "vitest";
import { EMPTY_SCENARIO } from "../src/lib/default-scenario";
import { assessCutoff } from "../src/lib/tax/cutoff";
import type { ScenarioInput } from "../src/lib/tax/scenario-input";

function at(profit: number, extra: Partial<ScenarioInput> = {}): ScenarioInput {
  return { ...EMPTY_SCENARIO, revenue: 300_000_000, accountingProfit: profit, ...extra };
}

describe("컷오프 판정 — 사업소득금액 기준 (Josh 2026-09-26)", () => {
  it("1억 미만 → 아직 아님", () => {
    expect(assessCutoff(at(99_999_999)).verdict).toBe("아직 아님");
  });
  it("1억 이상 2억 미만 → 검토 구간 (경계 1억 포함)", () => {
    expect(assessCutoff(at(100_000_000)).verdict).toBe("검토 구간");
    expect(assessCutoff(at(199_999_999)).verdict).toBe("검토 구간");
  });
  it("2억 이상 → 적극 검토", () => {
    expect(assessCutoff(at(200_000_000)).verdict).toBe("적극 검토");
  });
  it("세무조정액을 더한 사업소득금액으로 본다", () => {
    expect(assessCutoff(at(90_000_000, { taxAdjustment: 10_000_000 })).verdict).toBe("검토 구간");
  });

  describe("예외 — 아직 아님 → 검토 구간 승격", () => {
    it("사업용 부동산 취득 계획", () => {
      const r = assessCutoff(at(50_000_000, { plansRealEstatePurchase: true }));
      expect(r.verdict).toBe("검토 구간");
      expect(r.upgradedBy.some((s) => s.includes("부동산"))).toBe(true);
    });
    it("비세금 사유", () => {
      const r = assessCutoff(at(50_000_000, { nonTaxReasons: true }));
      expect(r.verdict).toBe("검토 구간");
    });
    it("성실신고 진입 예상 2년 이내 (선형 외삽)", () => {
      // 서비스 기준 5억. 3억→4억 추세 → 2026 진입
      const r = assessCutoff(
        at(50_000_000, { revenue: 400_000_000, revenueHistory: [{ year: 2024, revenue: 300_000_000 }, { year: 2025, revenue: 400_000_000 }] }),
      );
      expect(r.verdict).toBe("검토 구간");
      expect(r.upgradedBy.some((s) => s.includes("성실신고"))).toBe(true);
    });
    it("이미 성실신고 대상이면 승격", () => {
      expect(assessCutoff(at(50_000_000, { revenue: 600_000_000 })).verdict).toBe("검토 구간");
    });
    it("진입이 멀면 승격 없음", () => {
      const r = assessCutoff(
        at(50_000_000, { revenue: 120_000_000, revenueHistory: [{ year: 2024, revenue: 100_000_000 }, { year: 2025, revenue: 110_000_000 }] }),
      );
      expect(r.verdict).toBe("아직 아님");
    });
    it("예외는 2억 이상을 바꾸지 않는다", () => {
      expect(assessCutoff(at(250_000_000, { nonTaxReasons: true })).verdict).toBe("적극 검토");
    });
  });

  it("비세금 요인 카드: 매출 10억 이상 & 이익 1억 미만", () => {
    expect(assessCutoff(at(80_000_000, { revenue: 1_000_000_000 })).showNonTaxCard).toBe(true);
    expect(assessCutoff(at(120_000_000, { revenue: 1_000_000_000 })).showNonTaxCard).toBe(false);
    expect(assessCutoff(at(80_000_000, { revenue: 900_000_000 })).showNonTaxCard).toBe(false);
  });

  it("판정 근거는 Traced steps에 남는다", () => {
    const r = assessCutoff(at(150_000_000));
    expect(r.base.value).toBe(150_000_000);
    expect(r.base.steps.join(" ")).toContain("1억");
    expect(r.base.basis.some((b) => b.kind === "assumption")).toBe(true);
  });
});
