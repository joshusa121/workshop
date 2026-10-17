import { describe, expect, it } from "vitest";
import { ltcgDeduction, ltcgRate } from "../src/lib/tax/cgt/ltcg-deduction";

describe("장기보유특별공제율 (§95② 표1·표2)", () => {
  it("표1: 3년 6%, 연 2%p, 15년 30% 상한, 3년 미만 0", () => {
    expect(ltcgRate("table1", 2, 0).rate).toBe(0);
    expect(ltcgRate("table1", 3, 0).rate).toBe(0.06);
    expect(ltcgRate("table1", 6, 0).rate).toBe(0.12);
    expect(ltcgRate("table1", 10, 0).rate).toBe(0.2);
    expect(ltcgRate("table1", 12, 0).rate).toBe(0.24);
    expect(ltcgRate("table1", 15, 0).rate).toBe(0.3);
    expect(ltcgRate("table1", 30, 0).rate).toBe(0.3);
  });
  it("표2: 보유 12%+연4%p(최대40) + 거주 2년 8%·3년 12%·연4%p(최대40)", () => {
    expect(ltcgRate("table2", 10, 10).rate).toBe(0.8);
    expect(ltcgRate("table2", 3, 2).rate).toBeCloseTo(0.2, 10);
    expect(ltcgRate("table2", 3, 3).rate).toBeCloseTo(0.24, 10);
    expect(ltcgRate("table2", 5, 4).rate).toBeCloseTo(0.36, 10);
    expect(ltcgRate("table2", 20, 12).rate).toBe(0.8);
  });
  it("표2 요건 미달(보유 3년 미만 또는 거주 2년 미만)은 표2 불가 → 호출자가 표1로 전환", () => {
    expect(ltcgRate("table2", 2, 2).rate).toBe(0);
    expect(ltcgRate("table2", 5, 1).eligible).toBe(false);
  });
  it("공제액 Traced: 원 미만 버림, basis에 §95조", () => {
    const t = ltcgDeduction(342_857_142, { table: "table1", holdYears: 10, resideYears: 0 });
    expect(t.value).toBe(68_571_428);
    expect(t.basis[0]).toMatchObject({ kind: "law", law: "소득세법" });
    expect(t.steps.join(" ")).toContain("20");
  });
  it("none이면 0", () => {
    expect(ltcgDeduction(100_000_000, { table: "none", holdYears: 10, resideYears: 0 }).value).toBe(0);
  });
});
