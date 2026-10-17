import { describe, expect, it } from "vitest";
import { computeCompIncome } from "@/lib/tax/comp-income/engine";
import { DEFAULT_COMP_INCOME, normalizeCompIncome } from "@/lib/tax/comp-income/input";
import { decodeCompIncome, encodeCompIncome } from "@/lib/tax/comp-income/share";

const base = (over: Partial<typeof DEFAULT_COMP_INCOME> = {}) => normalizeCompIncome({ ...DEFAULT_COMP_INCOME, ...over });

describe("4화 Phase 3 감사 — 신규 독립 손계산", () => {
  it("E1 사업 없음·근로만 (급여 5천만)", () => {
    const r = computeCompIncome(base({ revenue: 0, expenses: 0, grossSalary: 50_000_000, npsPaid: 0 }));
    expect(r.businessIncome.value).toBe(0);
    expect(r.salaryIncome.value).toBe(37_750_000); // 50,000,000 − (12,000,000 + 5,000,000×5%)
    expect(r.totalIncome.value).toBe(37_750_000);
    expect(r.taxBase.value).toBe(36_250_000);
    expect(r.calcTax.value).toBe(4_177_500); // 840,000 + 22,250,000×15%
    // 한도 = max(66만 하한, 74만 − (5,000만−3,300만)×0.008=60.4만) = 66만
    expect(r.credits.earned.value).toBe(660_000);
    expect(r.credits.total.value).toBe(790_000);
    expect(r.determinedTax.value).toBe(3_387_500);
    expect(r.prepaid.total).toBe(0);
    expect(r.dueTotal).toBe(3_726_250);
  });

  it("E2 고소득 (사업소득 4억)", () => {
    const r = computeCompIncome(base({ revenue: 500_000_000, expenses: 100_000_000, npsPaid: 0 }));
    expect(r.taxBase.value).toBe(398_500_000);
    expect(r.calcTax.value).toBe(133_460_000);
    expect(r.determinedTax.value).toBe(133_390_000);
    expect(r.localTax.value).toBe(13_339_000);
    expect(r.prepaid.total).toBe(16_500_000);
  });

  it("E3 노란우산 구간한도(사업소득 1억 → 400만)", () => {
    const r = computeCompIncome(base({ revenue: 120_000_000, expenses: 20_000_000, npsPaid: 0, yellowUmbrellaPaid: 10_000_000 }));
    expect(r.businessIncome.value).toBe(100_000_000);
    expect(r.yellowUmbrella.value).toBe(4_000_000);
    expect(r.deductionTotal.value).toBe(5_500_000);
    expect(r.taxBase.value).toBe(94_500_000);
    expect(r.calcTax.value).toBe(17_635_000);
    expect(r.determinedTax.value).toBe(17_565_000);
  });

  it("극단값 0원 — 세금·원천징수 모두 0", () => {
    const r = computeCompIncome(base({ revenue: 0, expenses: 0, npsPaid: 0 }));
    expect(r.totalIncome.value).toBe(0);
    expect(r.determinedTax.value).toBe(0);
    expect(r.localTax.value).toBe(0);
    expect(r.dueTotal).toBe(0);
  });

  it("구버전 공유 링크(v 불일치) → 만료 안내", () => {
    const stale = Buffer.from(JSON.stringify({ v: 0, r: "old", d: {} })).toString("base64url");
    const d = decodeCompIncome(stale);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe("만료된 형식");
  });

  it("코덱은 세율 버전을 담아 변경 감지", () => {
    const code = encodeCompIncome(base({ revenue: 1_000_000 }));
    const d = decodeCompIncome(code);
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.ratesChanged).toBe(false);
  });
});
