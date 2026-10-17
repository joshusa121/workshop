import { describe, expect, it } from "vitest";
import { computeCompIncome } from "@/lib/tax/comp-income/engine";
import { normalizeCompIncome, DEFAULT_COMP_INCOME } from "@/lib/tax/comp-income/input";
import { encodeCompIncome, decodeCompIncome } from "@/lib/tax/comp-income/share";
import * as ratesComp from "@/lib/tax/comp-income/rates-comp";

const base = (over: Partial<typeof DEFAULT_COMP_INCOME> = {}) => normalizeCompIncome({ ...DEFAULT_COMP_INCOME, ...over });

describe("종합소득세 엔진 — 손계산 fixture", () => {
  it("F1 프리랜서 기본(사업소득만)", () => {
    const r = computeCompIncome(base({ revenue: 80_000_000, expenses: 20_000_000, npsPaid: 0 }));
    expect(r.businessIncome.value).toBe(60_000_000);
    expect(r.taxBase.value).toBe(58_500_000);
    expect(r.calcTax.value).toBe(8_280_000);
    expect(r.credits.total.value).toBe(70_000);
    expect(r.determinedTax.value).toBe(8_210_000);
    expect(r.localTax.value).toBe(821_000);
    expect(r.prepaid).toMatchObject({ fed: 2_400_000, local: 240_000, auto: true });
    expect(r.dueTotal).toBe(6_391_000);
  });

  it("F2 배우자+부양가족2+경로우대+노란우산600만", () => {
    const r = computeCompIncome(
      base({ revenue: 80_000_000, expenses: 20_000_000, spouse: true, dependents: 2, elderly: 1, npsPaid: 0, yellowUmbrellaPaid: 6_000_000 }),
    );
    expect(r.basicDeduction.value).toBe(6_000_000);
    expect(r.additionalDeduction.value).toBe(1_000_000);
    expect(r.yellowUmbrella.value).toBe(5_000_000);
    expect(r.deductionTotal.value).toBe(12_000_000);
    expect(r.taxBase.value).toBe(48_000_000);
    expect(r.calcTax.value).toBe(5_940_000);
    expect(r.determinedTax.value).toBe(5_870_000);
  });

  it("F3 겸업(근로 4천만 + 사업 3천만)", () => {
    const r = computeCompIncome(base({ revenue: 30_000_000, expenses: 10_000_000, grossSalary: 40_000_000, npsPaid: 0 }));
    expect(r.salaryIncome.value).toBe(28_750_000);
    expect(r.totalIncome.value).toBe(48_750_000);
    expect(r.taxBase.value).toBe(47_250_000);
    expect(r.calcTax.value).toBe(5_827_500);
    expect(r.credits.standard.value).toBe(130_000);
    expect(r.credits.earned.value).toBe(684_000);
    expect(r.determinedTax.value).toBe(5_013_500);
    expect(r.dueTotal).toBe(4_524_850);
  });

  it("F4 연금계좌세액공제 15% 구간", () => {
    const r = computeCompIncome(base({ revenue: 40_000_000, expenses: 10_000_000, npsPaid: 0, pensionAccountPaid: 6_000_000 }));
    expect(r.taxBase.value).toBe(28_500_000);
    expect(r.calcTax.value).toBe(3_015_000);
    expect(r.credits.pension.value).toBe(900_000);
    expect(r.determinedTax.value).toBe(2_045_000);
    expect(r.localTax.value).toBe(204_500);
  });

  it("F5 자녀 3명 + 부녀자 추가공제", () => {
    const r = computeCompIncome(base({ revenue: 50_000_000, expenses: 10_000_000, dependents: 3, femaleHead: true, children8Plus: 3, npsPaid: 0 }));
    expect(r.basicDeduction.value).toBe(6_000_000);
    expect(r.additionalDeduction.value).toBe(500_000);
    expect(r.taxBase.value).toBe(33_500_000);
    expect(r.credits.child.value).toBe(950_000);
    expect(r.determinedTax.value).toBe(2_745_000);
  });

  it("F6 성실신고확인비용 세액공제(한도 120만)", () => {
    const r = computeCompIncome(base({ revenue: 300_000_000, expenses: 100_000_000, npsPaid: 0, sincereApplies: true, sincereConfirmCost: 2_000_000 }));
    expect(r.taxBase.value).toBe(198_500_000);
    expect(r.calcTax.value).toBe(55_490_000);
    expect(r.credits.sincere.value).toBe(1_200_000);
    expect(r.determinedTax.value).toBe(54_220_000);
  });

  it("F7 결손금(경비 > 수입) — 세금 0, 원천징수는 환급", () => {
    const r = computeCompIncome(base({ revenue: 10_000_000, expenses: 15_000_000, npsPaid: 0 }));
    expect(r.businessIncome.value).toBe(0);
    expect(r.deficiency).toBe(5_000_000);
    expect(r.taxBase.value).toBe(0);
    expect(r.determinedTax.value).toBe(0);
    expect(r.dueTotal).toBe(-330_000);
  });

  it("F8 기납부세액 수동 입력 → 환급", () => {
    const r = computeCompIncome(base({ revenue: 30_000_000, expenses: 5_000_000, npsPaid: 0, prepaidWithholding: 3_000_000 }));
    expect(r.determinedTax.value).toBe(2_195_000);
    expect(r.prepaid.auto).toBe(false);
    expect(r.prepaid.fed).toBe(2_727_273);
    expect(r.prepaid.local).toBe(272_727);
    expect(r.dueTotal).toBe(-585_500);
  });
});

describe("공유 URL 코덱", () => {
  it("왕복 복원", () => {
    const input = base({ revenue: 123_456_789, expenses: 12_345_678, spouse: true, dependents: 2, children8Plus: 1 });
    const decoded = decodeCompIncome(encodeCompIncome(input));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.input).toEqual(input);
  });
  it("손상된 링크", () => {
    expect(decodeCompIncome("!!!not-base64!!!").ok).toBe(false);
  });
});

describe("rates meta", () => {
  const all = Object.values(ratesComp) as unknown[];
  const rateEntries = all.filter(
    (v) => typeof v === "object" && v !== null && "basis" in v && "value" in v,
  ) as { value: unknown; basis: Record<string, unknown> }[];
  const basisOnly = all.filter(
    (v) => typeof v === "object" && v !== null && (v as Record<string, unknown>).kind === "law",
  ) as Record<string, unknown>[];

  it("모든 RateEntry·Basis에 law 근거·확인일·URL이 있다", () => {
    expect(rateEntries.length).toBeGreaterThan(0);
    for (const e of rateEntries) {
      const b = e.basis;
      expect(b.kind).toBe("law");
      expect(b.confirmedAt).toBe("2026-10-16");
      expect(String(b.url)).toContain("law.go.kr");
    }
    expect(basisOnly.length).toBeGreaterThan(0);
    for (const b of basisOnly) {
      expect(b.confirmedAt).toBe("2026-10-16");
      expect(String(b.url)).toContain("law.go.kr");
    }
  });
});
