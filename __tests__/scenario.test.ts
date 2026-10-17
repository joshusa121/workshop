import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "../src/lib/tax/assumptions";
import { findCrossings } from "../src/lib/tax/breakeven";
import { runCorporate, runIndividual } from "../src/lib/tax/scenario";
import type { ScenarioInput } from "../src/lib/tax/scenario-input";

function sample(profit: number): ScenarioInput {
  return {
    revenue: 300_000_000,
    accountingProfit: profit,
    taxAdjustment: 0,
    industryGroup: "서비스임대",
    workplace: { sido: "서울특별시" },
    assets: { total: 100_000_000, realEstate: 0, housing: 0 },
    liabilities: 0,
    ownerSalary: 48_000_000,
    dividendAmount: profit >= 200_000_000 ? 64_556_609 : 11_156_609,
    retirementMultiple: 2,
    familyWorkers: 0,
    familySalaryEach: 36_000_000,
    familyLivesSeparately: false,    plansRealEstatePurchase: false,
    nonTaxReasons: false,
    yellowUmbrellaEnabled: false,
    startupReliefRate: 0,
    startupReliefYearsLeft: 3,
    retirementPlan: false,
    bookkeepingType: "복식부기",
    sincereFilingConfirmCost: 0,
    voluntaryEmploymentIns: false,
    voluntaryWorkersComp: false,
    personalContext: { otherIncome: 0 },
  };
}

describe("시나리오 손계산 SC4", () => {
  it("이익 8천만 개인", () => {
    const r = runIndividual(sample(80_000_000), DEFAULT_ASSUMPTIONS);
    expect(r.ownerDisposable.value).toBe(53_962_260);
    expect(r.corpRetained.value).toBe(0);
    expect(r.totalBurden.value).toBe(26_037_740);
    expect(r.combinedNetWorth.value).toBe(53_962_260);
  });

  it("이익 8천만 법인", () => {
    const r = runCorporate(sample(80_000_000), DEFAULT_ASSUMPTIONS);
    expect(r.ownerDisposable.value).toBe(50_491_747);
    expect(r.corpRetained.value).toBe(11_156_609);
    expect(r.combinedNetWorth.value).toBe(61_648_356);
  });

  it("이익 2억 개인", () => {
    const r = runIndividual(sample(200_000_000), DEFAULT_ASSUMPTIONS);
    expect(r.ownerDisposable.value).toBe(123_769_750);
    expect(r.totalBurden.value).toBe(76_230_250);
  });

  it("이익 2억 법인", () => {
    const r = runCorporate(sample(200_000_000), DEFAULT_ASSUMPTIONS);
    // 2026-09-26 D3: 배당 64,556,609 > 2천만 → 보수 외 소득 건보 3,624,576 (hand-calc NHX-b) 반영
    expect(r.ownerDisposable.value).toBe(95_668_147 - 3_624_576);
    expect(r.corpRetained.value).toBe(64_556_609);
    expect(r.combinedNetWorth.value).toBe(160_224_756 - 3_624_576);
  });

  it("이익 5억 개인", () => {
    const r = runIndividual(sample(500_000_000), DEFAULT_ASSUMPTIONS);
    expect(r.ownerDisposable.value).toBe(280_856_730);
  });

  it("개인 유보는 항상 0, 부담+가처분=이익", () => {
    for (const p of [80_000_000, 200_000_000, 500_000_000]) {
      const r = runIndividual(sample(p), DEFAULT_ASSUMPTIONS);
      expect(r.corpRetained.value).toBe(0);
      expect(r.ownerDisposable.value + r.totalBurden.value).toBe(p);
    }
  });
});

describe("findCrossings on scenario gap", () => {
  it("급여 고정 시 이익 구간에서 함수가 숫자를 낸다", () => {
    const f = (profit: number) => {
      const input = sample(profit);
      const corp = runCorporate(input, DEFAULT_ASSUMPTIONS).combinedNetWorth.value;
      const indiv = runIndividual(input, DEFAULT_ASSUMPTIONS).combinedNetWorth.value;
      return corp - indiv;
    };
    const xs = findCrossings(f, 20_000_000, 400_000_000, 80, 100_000);
    expect(Array.isArray(xs)).toBe(true);
    for (const x of xs) expect(x).toBeGreaterThan(0);
  });
});
