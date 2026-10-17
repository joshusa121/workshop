import { describe, expect, it } from "vitest";
import { computeFundsSource } from "@/lib/tax/funds-source/engine";
import { DEFAULT_FUNDS_SOURCE, normalizeFundsSource, type FundsSourceInput } from "@/lib/tax/funds-source/input";
import { encodeFundsSource, decodeFundsSource } from "@/lib/tax/funds-source/share";
import * as ratesFs from "@/lib/tax/funds-source/rates-fs";

const f = (over: Partial<FundsSourceInput> = {}) => normalizeFundsSource({ ...DEFAULT_FUNDS_SOURCE, ...over });

describe("자금출처 진단 — 손계산 fixture", () => {
  it("F1 취득 5억·소명 2.5억 → 추정 대상(부족 2.5억)", () => {
    const r = computeFundsSource(f({ acquisitionValue: 500_000_000, provenIncome: 100_000_000, provenInheritance: 50_000_000, provenDisposal: 100_000_000, fundsWithin10y: 250_000_000 }));
    expect(r.provenTotal.value).toBe(250_000_000);
    expect(r.unproven.value).toBe(250_000_000);
    expect(r.threshold).toBe(100_000_000); // min(5억×20%, 2억)
    expect(r.exempt).toBe(false);
    expect(r.presumptionTarget).toBe(250_000_000);
  });

  it("F2 취득 5억·소명 4.5억 → 배제(부족 5천만 < 기준 1억)", () => {
    const r = computeFundsSource(f({ acquisitionValue: 500_000_000, provenIncome: 450_000_000, provenInheritance: 0, provenDisposal: 0, fundsWithin10y: 450_000_000 }));
    expect(r.unproven.value).toBe(50_000_000);
    expect(r.threshold).toBe(100_000_000);
    expect(r.exempt).toBe(true);
  });

  it("F3 취득 20억·소명 18억 → 추정 대상(부족 2억 = 상한 2억, 미달 아님)", () => {
    const r = computeFundsSource(f({ acquisitionValue: 2_000_000_000, provenIncome: 1_800_000_000, provenInheritance: 0, provenDisposal: 0, fundsWithin10y: 1_800_000_000 }));
    expect(r.threshold).toBe(200_000_000); // min(4억, 2억)
    expect(r.unproven.value).toBe(200_000_000);
    expect(r.exempt).toBe(false);
  });

  it("F4 취득 20억·소명 18.1억 → 배제(1.9억 < 2억)", () => {
    const r = computeFundsSource(f({ acquisitionValue: 2_000_000_000, provenIncome: 1_810_000_000, provenInheritance: 0, provenDisposal: 0, fundsWithin10y: 1_810_000_000 }));
    expect(r.unproven.value).toBe(190_000_000);
    expect(r.exempt).toBe(true);
  });

  it("F5 소명 합계가 취득가액 이상 → 소명 완료", () => {
    const r = computeFundsSource(f({ acquisitionValue: 300_000_000, provenIncome: 400_000_000, provenInheritance: 0, provenDisposal: 0, fundsWithin10y: 400_000_000 }));
    expect(r.unproven.value).toBe(0);
    expect(r.exempt).toBe(true);
    expect(r.presumptionTarget).toBe(0);
  });

  it("F6 소액배제: 10년내 취득자금 4천만(<5천만) → 배제", () => {
    const r = computeFundsSource(f({ acquisitionValue: 100_000_000, provenIncome: 40_000_000, provenInheritance: 0, provenDisposal: 0, fundsWithin10y: 40_000_000 }));
    expect(r.smallExclusion).toBe(true);
    expect(r.exempt).toBe(true);
  });

  it("F7 경계: 부족액 == 기준액 → 추정 대상", () => {
    const r = computeFundsSource(f({ acquisitionValue: 1_000_000_000, provenIncome: 800_000_000, provenInheritance: 0, provenDisposal: 0, fundsWithin10y: 800_000_000 }));
    expect(r.threshold).toBe(200_000_000);
    expect(r.unproven.value).toBe(200_000_000);
    expect(r.exempt).toBe(false);
  });

  it("F8 취득 1억·소명 8,500만 → 배제(1,500만 < 2,000만)", () => {
    const r = computeFundsSource(f({ acquisitionValue: 100_000_000, provenIncome: 85_000_000, provenInheritance: 0, provenDisposal: 0, fundsWithin10y: 85_000_000 }));
    expect(r.threshold).toBe(20_000_000);
    expect(r.unproven.value).toBe(15_000_000);
    expect(r.exempt).toBe(true);
  });
});

describe("공유 URL 코덱", () => {
  it("왕복 복원", () => {
    const input = f({ acquisitionValue: 777_000_000, provenIncome: 321_000_000 });
    const d = decodeFundsSource(encodeFundsSource(input));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.input).toEqual(input);
  });
  it("손상된 링크", () => {
    expect(decodeFundsSource("###bogus###").ok).toBe(false);
  });
});

describe("rates meta", () => {
  const all = Object.values(ratesFs) as unknown[];
  const bases = all.filter((x) => typeof x === "object" && x !== null && (x as Record<string, unknown>).kind === "law") as Record<string, unknown>[];
  it("모든 근거에 확인일·URL", () => {
    expect(bases.length).toBeGreaterThan(0);
    for (const b of bases) {
      expect(b.confirmedAt).toBe("2026-10-16");
      expect(String(b.url)).toContain("law.go.kr");
    }
  });
});
