import { describe, expect, it } from "vitest";
import * as facts from "../src/lib/tax/goodwill/facts";
import type { Basis } from "../src/lib/tax/sources";

/** 2화 근거 메타 — 1화 rates-meta, 3화 cgt-rates-meta와 같은 규칙 (README 「근거가 빠지면 테스트 실패」 보장) */
function isRateEntry(v: unknown): v is { value: unknown; basis: Basis } {
  return typeof v === "object" && v !== null && "basis" in v && "value" in v;
}

describe("goodwill/facts.ts 근거 메타", () => {
  const entries = Object.entries(facts).filter(([, v]) => isRateEntry(v));

  it("RateEntry export가 있다", () => {
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
        expect(basis.confirmedAt, `${name}.confirmedAt`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("단독 Basis export(가정·요건 표기)도 kind와 설명이 있다", () => {
    const loose = Object.entries(facts).filter(
      ([, v]) => typeof v === "object" && v !== null && "kind" in v && !("value" in v),
    );
    for (const [name, b] of loose) {
      const basis = b as Basis;
      expect(basis.kind, name).toMatch(/^(law|official|assumption)$/);
      if (basis.kind === "assumption") expect(basis.description, `${name}.description`).toBeTruthy();
      if (basis.kind === "law") expect(basis.url, `${name}.url`).toMatch(/law\.go\.kr/);
    }
  });
});
