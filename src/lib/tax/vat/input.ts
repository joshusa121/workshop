import type { VatIndustry } from "./rates-vat";

export type VatInput = {
  industry: VatIndustry;
  /** 연간 매출 공급대가 (부가가치세 포함) */
  annualRevenue: number;
  /** 세금계산서 수취 매입 공급대가 (부가가치세 포함) */
  purchaseWithInvoice: number;
};

export const DEFAULT_VAT: VatInput = {
  industry: "retail",
  annualRevenue: 90_000_000,
  purchaseWithInvoice: 35_000_000,
};

const INDUSTRIES: VatIndustry[] = ["retail", "manufacturing", "lodging", "construction", "professional", "other"];

export function normalizeVat(input: Partial<VatInput>): VatInput {
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const merged = { ...DEFAULT_VAT, ...input };
  return {
    industry: INDUSTRIES.includes(merged.industry as VatIndustry) ? (merged.industry as VatIndustry) : "retail",
    annualRevenue: num(merged.annualRevenue),
    purchaseWithInvoice: num(merged.purchaseWithInvoice),
  };
}

/** 공급대가(부가세 포함) → 공급가액 */
export function supplyValue(gross: number): number {
  return gross / 1.1;
}
