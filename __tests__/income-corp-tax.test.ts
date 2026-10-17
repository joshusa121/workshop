import { describe, expect, it } from "vitest";
import { computeCorpTax } from "../src/lib/tax/corp-tax";
import { earnedIncomeDeduction, earnedIncomeTaxCredit } from "../src/lib/tax/deductions";
import { computeIncomeTax } from "../src/lib/tax/income-tax";

describe("computeIncomeTax — hand-calc I2", () => {
  it("I2-a 사업 5천만, 공제 150만", () => {
    const r = computeIncomeTax(50_000_000, 0, 1_500_000);
    expect(r.taxBase.value).toBe(48_500_000);
    expect(r.incomeTax.value).toBe(6_015_000);
    expect(r.localTax.value).toBe(601_500);
    expect(r.incomeTax.basis.some((b) => b.kind === "law" && b.article.includes("제55조"))).toBe(
      true,
    );
    expect(r.localTax.steps.some((s) => s.includes("결정세액") && s.includes("10"))).toBe(true);
  });

  it("I2-b 사업 1억, 공제 150만", () => {
    const r = computeIncomeTax(100_000_000, 0, 1_500_000);
    expect(r.taxBase.value).toBe(98_500_000);
    expect(r.incomeTax.value).toBe(19_035_000);
    expect(r.localTax.value).toBe(1_903_500);
  });

  it("I2-c 소득 0", () => {
    const r = computeIncomeTax(0, 0, 1_500_000);
    expect(r.taxBase.value).toBe(0);
    expect(r.incomeTax.value).toBe(0);
    expect(r.localTax.value).toBe(0);
  });

  it("I2-d 사업 1400만 + 타소득 200만", () => {
    const r = computeIncomeTax(14_000_000, 2_000_000, 1_500_000);
    expect(r.taxBase.value).toBe(14_500_000);
    expect(r.incomeTax.value).toBe(915_000);
    expect(r.localTax.value).toBe(91_500);
  });
});

describe("자동공제 5종 중 근로 관련 손계산", () => {
  it("근로소득공제 총급여 1천만", () => {
    expect(earnedIncomeDeduction(10_000_000).value).toBe(5_500_000);
  });
  it("근로소득공제 총급여 3,800만", () => {
    expect(earnedIncomeDeduction(38_000_000).value).toBe(10_950_000);
  });
  it("근로소득공제 총급여 1억", () => {
    expect(earnedIncomeDeduction(100_000_000).value).toBe(14_750_000);
  });
  it("근로세액공제 산출 100만·급여 3천만", () => {
    expect(earnedIncomeTaxCredit(1_000_000, 30_000_000).value).toBe(550_000);
  });
  it("근로세액공제 산출 200만·급여 5천만 (한도)", () => {
    expect(earnedIncomeTaxCredit(2_000_000, 50_000_000).value).toBe(660_000);
  });
});

describe("computeCorpTax — hand-calc C2", () => {
  it("C2-a 과표 1억", () => {
    const r = computeCorpTax(100_000_000);
    expect(r.corpTax.value).toBe(10_000_000);
    expect(r.localTax.value).toBe(1_000_000);
    expect(r.corpTax.basis.some((b) => b.kind === "law" && b.article.includes("제55조"))).toBe(true);
  });

  it("C2-b 과표 3억", () => {
    const r = computeCorpTax(300_000_000);
    expect(r.corpTax.value).toBe(40_000_000);
    expect(r.localTax.value).toBe(4_000_000);
  });

  it("C2-c 과표 0", () => {
    const r = computeCorpTax(0);
    expect(r.corpTax.value).toBe(0);
    expect(r.localTax.value).toBe(0);
  });
});
