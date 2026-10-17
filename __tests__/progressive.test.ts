import { describe, expect, it } from "vitest";
import { applyBrackets } from "../src/lib/tax/progressive";
import { CORP_TAX_BRACKETS, INCOME_TAX_BRACKETS } from "../src/lib/tax/rates";
import { floorTenWon } from "../src/lib/tax/rounding";

/** hand-calc-fixtures.md P1. 엔진과 별도로 손계산한 기대값. */
const INCOME_CASES: { id: string; base: number; tax: number }[] = [
  { id: "P1-0", base: 0, tax: 0 },
  { id: "P1-neg", base: -1, tax: 0 },
  { id: "P1-14m", base: 14_000_000, tax: 840_000 },
  { id: "P1-14m1", base: 14_000_001, tax: 840_000 },
  { id: "P1-50m", base: 50_000_000, tax: 6_240_000 },
  { id: "P1-50m1", base: 50_000_001, tax: 6_240_000 },
  { id: "P1-88m", base: 88_000_000, tax: 15_360_000 },
  { id: "P1-150m", base: 150_000_000, tax: 37_060_000 },
  { id: "P1-300m", base: 300_000_000, tax: 94_060_000 },
  { id: "P1-500m", base: 500_000_000, tax: 174_060_000 },
  { id: "P1-1b", base: 1_000_000_000, tax: 384_060_000 },
  { id: "P1-2b", base: 2_000_000_000, tax: 834_060_000 },
  { id: "P1-round", base: 1_000_017, tax: 60_000 },
];

const CORP_CASES: { id: string; base: number; tax: number }[] = [
  { id: "C1-0", base: 0, tax: 0 },
  { id: "C1-2e", base: 200_000_000, tax: 20_000_000 },
  { id: "C1-2e1", base: 200_000_001, tax: 20_000_000 },
  { id: "C1-3e", base: 300_000_000, tax: 40_000_000 },
];

describe("applyBrackets 소득세 §55①", () => {
  it.each(INCOME_CASES)("$id 과표 $base → $tax", ({ base, tax }) => {
    const t = applyBrackets(base, INCOME_TAX_BRACKETS, "종합소득 산출세액", floorTenWon);
    expect(t.value).toBe(tax);
    expect(t.basis[0]?.kind === "law" && t.basis[0].article).toBe("제55조 제1항");
  });
});

describe("applyBrackets 법인세 §55①", () => {
  it.each(CORP_CASES)("$id 과표 $base → $tax", ({ base, tax }) => {
    const t = applyBrackets(base, CORP_TAX_BRACKETS, "법인세 산출세액", floorTenWon);
    expect(t.value).toBe(tax);
  });
});

describe("절사", () => {
  it("10원 미만은 버린다", () => {
    expect(floorTenWon(60_001.02)).toBe(60_000);
    expect(floorTenWon(20_000_000.2)).toBe(20_000_000);
  });
});

describe("단조성", () => {
  it("과표가 늘면 세액이 줄지 않는다 (표본 200)", () => {
    const bases = Array.from({ length: 200 }, (_, i) => {
      const seed = (i * 1_664_525 + 1_013_904_223) >>> 0;
      return seed % 2_000_000_001;
    }).sort((a, b) => a - b);
    let prevTax = 0;
    let prevBase = -1;
    for (const base of bases) {
      const tax = applyBrackets(base, INCOME_TAX_BRACKETS, "t", floorTenWon).value;
      if (base > prevBase) expect(tax).toBeGreaterThanOrEqual(prevTax);
      prevTax = tax;
      prevBase = base;
    }
  });
});
