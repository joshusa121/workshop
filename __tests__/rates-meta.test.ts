import { describe, expect, it } from "vitest";
import * as rates from "../src/lib/tax/rates";
import type { Basis } from "../src/lib/tax/sources";

function isRateEntry(v: unknown): v is { value: unknown; basis: Basis } {
  return typeof v === "object" && v !== null && "basis" in v && "value" in v;
}

function assertLawBasis(name: string, basis: Extract<Basis, { kind: "law" }>) {
  expect(basis.law, `${name}.basis.law`).toBeTruthy();
  expect(basis.article, `${name}.basis.article`).toBeTruthy();
  expect(basis.effectiveFrom, `${name}.basis.effectiveFrom`).toBeTruthy();
  expect(basis.appliesTo, `${name}.basis.appliesTo`).toBeTruthy();
  expect(basis.confirmedAt, `${name}.basis.confirmedAt`).toBeTruthy();
}

describe("rates.ts 근거 메타", () => {
  const entries = Object.entries(rates).filter(([, v]) => isRateEntry(v));

  it("RateEntry export가 하나 이상이다", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("모든 RateEntry에 basis 필수 필드가 있다", () => {
    for (const [name, raw] of entries) {
      const { basis } = raw as { basis: Basis };
      expect(basis.kind, name).toMatch(/^(law|official|assumption)$/);
      if (basis.kind === "law") assertLawBasis(name, basis);
      if (basis.kind === "official") {
        expect(basis.source, `${name}.source`).toBeTruthy();
        expect(basis.confirmedAt, `${name}.confirmedAt`).toBeTruthy();
      }
    }
  });

  it("named export는 RateEntry이거나 타입만이다", () => {
    const leftover = Object.entries(rates).filter(([, v]) => !isRateEntry(v));
    expect(leftover.map(([n]) => n)).toEqual([]);
  });
});
