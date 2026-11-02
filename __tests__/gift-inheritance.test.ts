import { describe, expect, it } from "vitest";
import { computeGiftInheritance, computeGiftTax, computeInheritanceTax } from "@/lib/tax/gift-inheritance/engine";
import { DEFAULT_GIFT_INHERITANCE, normalizeGiftInheritance, type GiftInheritanceInput } from "@/lib/tax/gift-inheritance/input";
import { encodeGiftInheritance, decodeGiftInheritance } from "@/lib/tax/gift-inheritance/share";
import * as ratesGi from "@/lib/tax/gift-inheritance/rates-gi";

const g = (over: Partial<GiftInheritanceInput> = {}) => normalizeGiftInheritance({ ...DEFAULT_GIFT_INHERITANCE, ...over });

describe("증여 vs 상속 — 손계산 fixture", () => {
  it("F1 전액 상속 20억·자녀1·배우자X → 장례비 500만 차감 후 4.38억", () => {
    // 20억 − 장례비 500만(영 §9②1호 최소액) = 19.95억, 일괄공제 5억 → 과표 14.95억
    // 2.4억 + (14.95억 − 10억) × 40% = 4.38억. korean-tax-calc-mcp 0.17.0 inheritance_tax 산출세액과 일치(2026-11-02).
    const r = computeInheritanceTax(2_000_000_000, false, 1);
    expect(r.funeral).toBe(5_000_000);
    expect(r.taxableEstate).toBe(1_995_000_000);
    expect(r.deduction).toBe(500_000_000);
    expect(r.taxBase).toBe(1_495_000_000);
    expect(r.tax).toBe(438_000_000);
  });

  it("F2 전액 증여 20억(자녀) → 6.2억", () => {
    const r = computeGiftTax(2_000_000_000, "child");
    expect(r.deduction).toBe(50_000_000);
    expect(r.taxBase).toBe(1_950_000_000);
    expect(r.tax).toBe(620_000_000);
  });

  it("F3 분할 증여 2회 + 잔액 상속 19억 → 총 3.98억(절감 4천만)", () => {
    // 19억 − 500만 − 5억 = 과표 13.95억 → 2.4억 + 3.95억 × 40% = 3.98억
    const r = computeGiftInheritance(g({ assets: 2_000_000_000, beneficiary: "child", tranches: 2 }));
    expect(r.split.total).toBe(398_000_000);
    expect(r.inherit.total).toBe(438_000_000);
    expect(r.savedBySplit).toBe(40_000_000);
  });

  it("F4 전액 상속 10억·배우자O·자녀1 → 0", () => {
    const r = computeInheritanceTax(1_000_000_000, true, 1);
    expect(r.taxableEstate).toBe(995_000_000);
    expect(r.deduction).toBe(995_000_000);
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

  it("F9 상속재산 300만(장례비 최소액 미만) → 장례비는 재산 한도, 과세가액 0", () => {
    const r = computeInheritanceTax(3_000_000, false, 1);
    expect(r.funeral).toBe(3_000_000);
    expect(r.taxableEstate).toBe(0);
    expect(r.tax).toBe(0);
  });

  it("F10 공제 경계: 5억500만(자녀1) → 장례비 차감 후 과표 0", () => {
    const r = computeInheritanceTax(505_000_000, false, 1);
    expect(r.taxableEstate).toBe(500_000_000);
    expect(r.taxBase).toBe(0);
    expect(r.tax).toBe(0);
  });

  it("F11 5억500만1원 → 과표 1원, 산출 0(10% 원 미만 버림)", () => {
    const r = computeInheritanceTax(505_000_001, false, 1);
    expect(r.taxBase).toBe(1);
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
      // 2026-10-16 최초 확인, 2026-11-02 장례비 최소 공제(영 §9②) 추가 확인
      expect(["2026-10-16", "2026-11-02"]).toContain(e.basis.confirmedAt);
      expect(String(e.basis.url)).toContain("law.go.kr");
    }
    for (const b of bases) expect(String(b.url)).toContain("law.go.kr");
  });
});
