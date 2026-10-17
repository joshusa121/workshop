import { describe, expect, it } from "vitest";
import { computeOwnerIncomeTax } from "../src/lib/tax/dividend";

describe("배당 비교과세 — hand-calc F4", () => {
  it("F4-a 2천만원 이하 분리", () => {
    const r = computeOwnerIncomeTax({
      nonFinancialIncome: 50_000_000,
      deductions: 1_500_000,
      dividend: 10_000_000,
      taxCredits: 0,
    });
    expect(r.calculatedTax.value).toBe(7_415_000);
    expect(r.dividendCredit.value).toBe(0);
    expect(r.determinedTax.value).toBe(7_415_000);
    expect(r.localTax.value).toBe(741_500);
    expect(r.calculatedTax.basis.some((b) => b.kind === "law" && b.article.includes("제62조"))).toBe(
      true,
    );
  });

  it("F4-b 초과 + 그로스업 + 한도", () => {
    const r = computeOwnerIncomeTax({
      nonFinancialIncome: 50_000_000,
      deductions: 1_500_000,
      dividend: 30_000_000,
      taxCredits: 0,
    });
    expect(r.dividendCredit.value).toBe(1_000_000);
    expect(r.calculatedTax.value).toBe(10_320_000);
    expect(r.localTax.value).toBe(1_032_000);
  });

  it("F4-c 비교과세가 더 큼 — 공제 0", () => {
    const r = computeOwnerIncomeTax({
      nonFinancialIncome: 0,
      deductions: 1_500_000,
      dividend: 30_000_000,
      taxCredits: 0,
    });
    expect(r.dividendCredit.value).toBe(0);
    expect(r.calculatedTax.value).toBe(4_200_000);
  });

  it("R1 개인지방소득세 = 결정세액 × 10% (세액공제 반영, 지특법 §167의2①)", () => {
    const r = computeOwnerIncomeTax({
      nonFinancialIncome: 50_000_000,
      deductions: 1_500_000,
      dividend: 0,
      taxCredits: 700_000,
    });
    expect(r.calculatedTax.value).toBe(6_015_000);
    expect(r.determinedTax.value).toBe(5_315_000);
    expect(r.localTax.value).toBe(531_500);
    expect(r.localTax.basis.some((b) => b.kind === "law" && b.article.includes("제167조의2"))).toBe(true);
  });
});
