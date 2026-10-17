import { describe, expect, it } from "vitest";
import { annuityFactor, valueGoodwill } from "../src/lib/tax/goodwill/valuation";

describe("goodwill valuation (상증령 §59②, 규칙 §16②·§19①)", () => {
  it("현가 계수 합 = 3.7908 (식으로 계산)", () => {
    expect(annuityFactor()).toBeCloseTo(3.7908, 4);
    expect(annuityFactor(0.1, 5)).toBeCloseTo(0.9091 + 0.8264 + 0.7513 + 0.683 + 0.6209, 3);
  });

  it("가중치는 직전 1년 ×3, 2년 ×2, 3년 ×1 — 순서를 바꾸면 값이 달라진다", () => {
    const a = valueGoodwill({ netIncomes: [150_000_000, 120_000_000, 100_000_000], equity: 0 });
    const b = valueGoodwill({ netIncomes: [100_000_000, 120_000_000, 150_000_000], equity: 0 });
    expect(a.weightedAvg.value).toBeCloseTo(131_666_666.67, 1);
    expect(b.weightedAvg.value).toBeCloseTo(115_000_000, 1);
    expect(a.weightedAvg.steps[0]).toContain("직전 1년 150,000,000 × 3");
  });

  it("가중평균 음수 → 0", () => {
    const v = valueGoodwill({ netIncomes: [-100_000_000, 10_000_000, 10_000_000], equity: 0 });
    expect(v.weightedAvg.value).toBe(0);
    expect(v.goodwill.value).toBe(0);
  });

  it("초과이익 음수 → 영업권 0", () => {
    const v = valueGoodwill({ netIncomes: [20_000_000, 20_000_000, 20_000_000], equity: 500_000_000 });
    expect(v.excessProfit.value).toBe(0);
    expect(v.goodwill.value).toBe(0);
    expect(v.excessProfit.steps[2]).toContain("음수이므로 0");
  });

  it("모든 값에 basis가 붙는다", () => {
    const v = valueGoodwill({ netIncomes: [100_000_000, 100_000_000, 100_000_000], equity: 0 });
    for (const t of [v.weightedAvg, v.excessProfit, v.goodwill]) expect(t.basis.length).toBeGreaterThan(0);
    expect(v.presentValues).toHaveLength(5);
  });

  it("R6 자기자본 음수: 산식대로 계산해 평가액이 커지고 경고 문구가 붙는다", () => {
    const withNeg = valueGoodwill({ netIncomes: [50_000_000, 40_000_000, 30_000_000], equity: -100_000_000 });
    const withZero = valueGoodwill({ netIncomes: [50_000_000, 40_000_000, 30_000_000], equity: 0 });
    expect(withNeg.goodwill.value).toBeGreaterThan(withZero.goodwill.value);
    expect(withNeg.excessProfit.steps.join(" ")).toContain("자기자본이 마이너스라 평가액이 커졌습니다");
  });
});
