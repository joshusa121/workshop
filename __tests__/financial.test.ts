import { describe, expect, it } from "vitest";
import { computeFinancial } from "@/lib/tax/financial/engine";
import { DEFAULT_FINANCIAL, normalizeFinancial, type FinancialInput } from "@/lib/tax/financial/input";
import { encodeFinancial, decodeFinancial } from "@/lib/tax/financial/share";
import * as ratesFin from "@/lib/tax/financial/rates-fin";

const f = (over: Partial<FinancialInput> = {}) => normalizeFinancial({ ...DEFAULT_FINANCIAL, ...over });

describe("금융투자 세금 — 손계산 fixture", () => {
  it("F1 이자 800만+배당 1,800만(초과) → 종합과세 결과 원천징수와 동일(추가납부 0)", () => {
    const r = computeFinancial(f({ interest: 8_000_000, dividend: 18_000_000, otherIncome: 0, deductions: 0 }));
    expect(r.financialIncome).toBe(26_000_000);
    expect(r.overThreshold).toBe(true);
    expect(r.withholdingFed.value).toBe(3_640_000);
    expect(r.calculatedTax.value).toBe(3_640_000);
    expect(r.dueTotal).toBe(0);
  });

  it("F2 이자 3천만+배당 3천만+다른소득 5천만 → 추가납부 발생", () => {
    const r = computeFinancial(f({ interest: 30_000_000, dividend: 30_000_000, otherIncome: 50_000_000 }));
    expect(r.financialIncome).toBe(60_000_000);
    expect(r.calculatedTax.value).toBe(16_910_000);
    expect(r.dividendCredit.value).toBe(3_000_000);
    expect(r.determinedTax.value).toBe(16_910_000);
    expect(r.localTax.value).toBe(1_691_000);
    expect(r.dueFed).toBe(8_510_000);
    expect(r.dueTotal).toBe(9_361_000);
  });

  it("F3 이자·배당 합계 2천만 이하 → 분리과세(원천징수 종결)", () => {
    const r = computeFinancial(f({ interest: 10_000_000, dividend: 5_000_000, otherIncome: 30_000_000 }));
    expect(r.overThreshold).toBe(false);
    expect(r.dividendCredit.value).toBe(0);
    expect(r.calculatedTax.value).toBe(5_340_000);
  });

  it("F4 대주주 주식 양도차익 5억 → 1.2억대", () => {
    const r = computeFinancial(f({ interest: 0, dividend: 0, stockGain: 500_000_000, holder: "major" }));
    expect(r.stock.taxBase.value).toBe(497_500_000);
    expect(r.stock.tax.value).toBe(109_375_000);
    expect(r.stock.localTax.value).toBe(10_937_500);
    expect(r.stock.total).toBe(120_312_500);
  });

  it("F5 비대주주 중소기업 1억 → 10%", () => {
    const r = computeFinancial(f({ interest: 0, dividend: 0, stockGain: 100_000_000, holder: "minor", smallCap: true }));
    expect(r.stock.taxBase.value).toBe(97_500_000);
    expect(r.stock.tax.value).toBe(9_750_000);
  });

  it("F6 대주주·1년 미만·중소기업 외 1억 → 30%", () => {
    const r = computeFinancial(f({ interest: 0, dividend: 0, stockGain: 100_000_000, holder: "major", heldUnder1y: true, smallCap: false }));
    expect(r.stock.tax.value).toBe(29_250_000);
  });

  it("F7 양도차익 250만 이하 → 양도세 0", () => {
    const r = computeFinancial(f({ interest: 0, dividend: 0, stockGain: 2_000_000 }));
    expect(r.stock.taxBase.value).toBe(0);
    expect(r.stock.total).toBe(0);
  });
});

describe("공유 URL 코덱", () => {
  it("왕복 복원", () => {
    const input = f({ interest: 12_000_000, dividend: 33_000_000, stockGain: 55_000_000, holder: "minor", smallCap: true });
    const d = decodeFinancial(encodeFinancial(input));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.input).toEqual(input);
  });
  it("손상된 링크", () => {
    expect(decodeFinancial("@@nope@@").ok).toBe(false);
  });
});

describe("rates meta", () => {
  const all = Object.values(ratesFin) as unknown[];
  const entries = all.filter((x) => typeof x === "object" && x !== null && "basis" in x && "value" in x) as { basis: Record<string, unknown> }[];
  const bases = all.filter((x) => typeof x === "object" && x !== null && (x as Record<string, unknown>).kind === "law") as Record<string, unknown>[];
  it("RateEntry·Basis 근거", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.basis.kind).toBe("law");
      expect(typeof e.basis.confirmedAt).toBe("string");
      expect(String(e.basis.url)).toContain("law.go.kr");
    }
    for (const b of bases) expect(String(b.url)).toContain("law.go.kr");
  });
});
