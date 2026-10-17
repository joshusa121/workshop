import { describe, expect, it } from "vitest";
import * as rates from "../src/lib/tax/cgt/rates-cgt";
import type { Basis } from "../src/lib/tax/sources";

function isRateEntry(v: unknown): v is { value: unknown; basis: Basis } {
  return typeof v === "object" && v !== null && "basis" in v && "value" in v;
}

describe("rates-cgt.ts 근거 메타", () => {
  const entries = Object.entries(rates).filter(([, v]) => isRateEntry(v));

  it("RateEntry export가 하나 이상이다", () => {
    expect(entries.length).toBeGreaterThan(5);
  });

  it("모든 RateEntry에 basis 필수 필드가 있다", () => {
    for (const [name, raw] of entries) {
      const { basis } = raw as { basis: Basis };
      expect(basis.kind, name).toMatch(/^(law|official|assumption)$/);
      if (basis.kind === "law") {
        expect(basis.law, `${name}.law`).toBeTruthy();
        expect(basis.article, `${name}.article`).toBeTruthy();
        expect(basis.url, `${name}.url`).toMatch(/law\.go\.kr/);
        expect(basis.effectiveFrom, `${name}.effectiveFrom`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(basis.appliesTo, `${name}.appliesTo`).toBeTruthy();
        expect(basis.confirmedAt, `${name}.confirmedAt`).toBe("2026-09-26");
      }
    }
  });

  it("named export는 RateEntry뿐이다", () => {
    const leftover = Object.entries(rates).filter(([, v]) => !isRateEntry(v));
    expect(leftover.map(([n]) => n)).toEqual([]);
  });

  it("cgt-facts.md 값과 일치한다", () => {
    expect(rates.CGT_FLAT_RATES.value).toEqual({ housingUnder1y: 0.7, housing1to2y: 0.6, presale: 0.6, unregistered: 0.7 });
    expect(rates.CGT_SURCHARGE.value).toEqual({ twoHouses: 0.2, threeOrMore: 0.3 });
    expect(rates.HIGH_VALUE_THRESHOLD.value).toBe(1_200_000_000);
    expect(rates.CGT_BASIC_DEDUCTION.value).toBe(2_500_000);
    expect(rates.TEMPORARY_TWO_HOUSES.value).toEqual({ minGapYears: 1, disposeWithinYears: 3 });
    expect(rates.MERGER_SPECIAL_YEARS.value).toBe(10);
  });
});
