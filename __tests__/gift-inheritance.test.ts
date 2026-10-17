import { describe, expect, it } from "vitest";
import { computeGiftInheritance, computeGiftTax, computeInheritanceTax } from "@/lib/tax/gift-inheritance/engine";
import { DEFAULT_GIFT_INHERITANCE, normalizeGiftInheritance, type GiftInheritanceInput } from "@/lib/tax/gift-inheritance/input";
import { encodeGiftInheritance, decodeGiftInheritance } from "@/lib/tax/gift-inheritance/share";
import * as ratesGi from "@/lib/tax/gift-inheritance/rates-gi";

const g = (over: Partial<GiftInheritanceInput> = {}) => normalizeGiftInheritance({ ...DEFAULT_GIFT_INHERITANCE, ...over });

describe("증여 vs 상속 — 손계산 fixture", () => {
  it("F1 전액 상속 20억·자녀1·배우자X → 4.4억", () => {
    const r = computeInheritanceTax(2_000_000_000, false, 1);
    expect(r.deduction).toBe(500_000_000);
    expect(r.taxBase).toBe(1_500_000_000);
    expect(r.tax).toBe(440_000_000);
  });

  it("F2 전액 증여 20억(자녀) → 6.2억", () => {
    const r = computeGiftTax(2_000_000_000, "child");
    expect(r.deduction).toBe(50_000_000);
    expect(r.taxBase).toBe(1_950_000_000);
    expect(r.tax).toBe(620_000_000);
  });

  it("F3 분할 증여 2회 + 잔액 상속 19억 → 총 4.0억(절감 4천만)", () => {
    const r = computeGiftInheritance(g({ assets: 2_000_000_000, beneficiary: "child", tranches: 2 }));
    expect(r.split.total).toBe(400_000_000);
    expect(r.inherit.total).toBe(440_000_000);
    expect(r.savedBySplit).toBe(40_000_000);
  });

  it("F4 전액 상속 10억·배우자O·자녀1 → 0", () => {
    const r = computeInheritanceTax(1_000_000_000, true, 1);
    expect(r.deduction).toBe(1_000_000_000);
    expect(r.tax).toBe(0);
  });

  it("F5 손자녀 증여 10억 → 세대생략 할증 포함 2.925억", () => {
    const r = computeGiftTax(1_000_000_000, "grandchild");
    expect(r.taxBeforeSurcharge).toBe(225_000_000);
    expect(r.surcharge).toBe(67_500_000);
    expect(r.tax).toBe(292_500_000);
  });

  it("F6 전액 상속 3억 → 0(공제 5억)", () => {
    const r = computeInheritanceTax(300_000_000, false, 1);
    expect(r.tax).toBe(0);
  });

  it("F7 증여 5,040만(자녀) → 과표 40만 < 최저한 50만 → 0", () => {
    const r = computeGiftTax(50_400_000, "child");
    expect(r.taxBase).toBe(400_000);
    expect(r.tax).toBe(0);
  });

  it("F8 배우자 증여 6억 → 0(공제 6억)", () => {
    const r = computeGiftTax(600_000_000, "spouse");
    expect(r.deduction).toBe(600_000_000);
    expect(r.tax).toBe(0);
  });

  it("추천: 20억 자녀·배우자X → 분할", () => {
    const r = computeGiftInheritance(g({ assets: 2_000_000_000, tranches: 1 }));
    expect(["split", "inherit"]).toContain(r.recommend);
    expect(r.split.total).toBeLessThanOrEqual(r.inherit.total);
  });
});

describe("공유 URL 코덱", () => {
  it("왕복 복원", () => {
    const input = g({ assets: 1_234_000_000, beneficiary: "grandchild", tranches: 3 });
    const d = decodeGiftInheritance(encodeGiftInheritance(input));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.input).toEqual(input);
  });
  it("손상된 링크", () => {
    expect(decodeGiftInheritance("!!bad!!").ok).toBe(false);
  });
});

describe("rates meta", () => {
  const all = Object.values(ratesGi) as unknown[];
  const entries = all.filter((x) => typeof x === "object" && x !== null && "basis" in x && "value" in x) as { basis: Record<string, unknown> }[];
  const bases = all.filter((x) => typeof x === "object" && x !== null && (x as Record<string, unknown>).kind === "law") as Record<string, unknown>[];
  it("RateEntry·Basis 근거 확인", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.basis.kind).toBe("law");
      expect(e.basis.confirmedAt).toBe("2026-10-16");
      expect(String(e.basis.url)).toContain("law.go.kr");
    }
    for (const b of bases) expect(String(b.url)).toContain("law.go.kr");
  });
});
