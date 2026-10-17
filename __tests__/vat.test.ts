import { describe, expect, it } from "vitest";
import { computeVat } from "@/lib/tax/vat/engine";
import { DEFAULT_VAT, normalizeVat, type VatInput } from "@/lib/tax/vat/input";
import { encodeVat, decodeVat } from "@/lib/tax/vat/share";
import * as ratesVat from "@/lib/tax/vat/rates-vat";

const v = (over: Partial<VatInput> = {}) => normalizeVat({ ...DEFAULT_VAT, ...over });

describe("부가가치세 엔진 — 손계산 fixture", () => {
  it("F1 소매업 매출 1억·매입 4천만", () => {
    const r = computeVat(v({ industry: "retail", annualRevenue: 100_000_000, purchaseWithInvoice: 40_000_000 }));
    expect(r.outputTax.value).toBe(9_090_909);
    expect(r.inputTax.value).toBe(3_636_363);
    expect(r.generalTax.value).toBe(5_454_546);
    expect(r.simpleTax.value).toBe(1_300_000);
    expect(r.diff).toBe(-4_154_546);
    expect(r.simpleEligible).toBe(true);
    expect(r.simpleExempt).toBe(false);
    expect(r.recommend).toBe("simple");
  });

  it("F2 소매업 매출 4천만 → 간이 납부면제", () => {
    const r = computeVat(v({ industry: "retail", annualRevenue: 40_000_000, purchaseWithInvoice: 0 }));
    expect(r.generalTax.value).toBe(3_636_363);
    expect(r.simpleExempt).toBe(true);
    expect(r.simpleTax.value).toBe(0);
  });

  it("F3 제조업 매출 1.2억 → 간이 적용 불가", () => {
    const r = computeVat(v({ industry: "manufacturing", annualRevenue: 120_000_000, purchaseWithInvoice: 50_000_000 }));
    expect(r.generalTax.value).toBe(6_363_636);
    expect(r.simpleEligible).toBe(false);
    expect(r.simpleTax.value).toBe(2_150_000);
  });

  it("F4 전문(40%) 매출 8천만·매입 2천만", () => {
    const r = computeVat(v({ industry: "professional", annualRevenue: 80_000_000, purchaseWithInvoice: 20_000_000 }));
    expect(r.valueRate).toBe(0.4);
    expect(r.generalTax.value).toBe(5_454_546);
    expect(r.simpleTax.value).toBe(3_100_000);
    expect(r.diff).toBe(-2_354_546);
  });

  it("F5 매입 > 매출 → 일반과세 환급", () => {
    const r = computeVat(v({ industry: "retail", annualRevenue: 30_000_000, purchaseWithInvoice: 50_000_000 }));
    expect(r.generalTax.value).toBe(-1_818_182);
    expect(r.simpleTax.value).toBe(0);
  });

  it("F6 제조업 매출 1억·매입 3천만", () => {
    const r = computeVat(v({ industry: "manufacturing", annualRevenue: 100_000_000, purchaseWithInvoice: 30_000_000 }));
    expect(r.generalTax.value).toBe(6_363_637);
    expect(r.simpleTax.value).toBe(1_850_000);
  });

  it("F7 경계: 매출 정확히 1억 400만 → 간이 불가", () => {
    const r = computeVat(v({ industry: "retail", annualRevenue: 104_000_000, purchaseWithInvoice: 0 }));
    expect(r.simpleEligible).toBe(false);
  });

  it("F8 경계: 매출 정확히 4,800만 → 면제 아님", () => {
    const r = computeVat(v({ industry: "retail", annualRevenue: 48_000_000, purchaseWithInvoice: 0 }));
    expect(r.simpleExempt).toBe(false);
    expect(r.simpleTax.value).toBe(720_000);
  });
});

describe("공유 URL 코덱", () => {
  it("왕복 복원", () => {
    const input = v({ industry: "construction", annualRevenue: 77_000_000, purchaseWithInvoice: 11_000_000 });
    const d = decodeVat(encodeVat(input));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.input).toEqual(input);
  });
  it("손상된 링크", () => {
    expect(decodeVat("@@@notbase64@@@").ok).toBe(false);
  });
});

describe("rates meta", () => {
  const all = Object.values(ratesVat) as unknown[];
  const entries = all.filter((x) => typeof x === "object" && x !== null && "basis" in x && "value" in x) as {
    basis: Record<string, unknown>;
  }[];
  it("모든 RateEntry에 law 근거·확인일·URL", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.basis.kind).toBe("law");
      expect(e.basis.confirmedAt).toBe("2026-10-16");
      expect(String(e.basis.url)).toContain("law.go.kr");
    }
  });
});
