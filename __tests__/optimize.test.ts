import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "../src/lib/tax/assumptions";
import { findOptimalSalary, searchValue } from "../src/lib/tax/optimize";
import { runCorporate } from "../src/lib/tax/scenario";
import type { ScenarioInput } from "../src/lib/tax/scenario-input";

const sc4: ScenarioInput = {
  revenue: 600_000_000,
  accountingProfit: 80_000_000,
  taxAdjustment: 0,
  industryGroup: "서비스임대",
  workplace: { sido: "서울특별시" },
  assets: { total: 200_000_000, realEstate: 50_000_000, housing: 0 },
  liabilities: 40_000_000,
  ownerSalary: 48_000_000,
  dividendAmount: 11_156_609,
  retirementMultiple: 2,
  familyWorkers: 0,
  familySalaryEach: 36_000_000,
  familyLivesSeparately: false,  plansRealEstatePurchase: false,
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

describe("최적 급여 탐색 (전수 스캔)", () => {
  it("결과 급여는 0~이익 범위, step 배수, 축 값은 현재 급여 이상", () => {
    for (const axis of ["ownerDisposable", "combinedNetWorth"] as const) {
      const o = findOptimalSalary(sc4, DEFAULT_ASSUMPTIONS, axis);
      expect(o.salary).toBeGreaterThanOrEqual(0);
      expect(o.salary).toBeLessThanOrEqual(80_000_000);
      expect(o.salary % 1_000_000).toBe(0);
      expect(o.value).toBe(searchValue(runCorporate({ ...sc4, ownerSalary: o.salary }, DEFAULT_ASSUMPTIONS), axis));
      expect(o.gainVsCurrent).toBeGreaterThanOrEqual(0);
    }
  });
  it("R3: 합산 순자산 축은 2차 과세 추정을 뺀 값으로 탐색한다 (급여 0원이 아니라 양수)", () => {
    // 이익 1.5억: 종전엔 급여 0원이 최적으로 나왔다. 이제 2차 과세를 빼면 급여를 주는 쪽이 낫다.
    const opt = findOptimalSalary({ ...sc4, accountingProfit: 150_000_000 }, DEFAULT_ASSUMPTIONS, "combinedNetWorth");
    expect(opt.salary).toBeGreaterThan(0);
    const r = runCorporate({ ...sc4, accountingProfit: 150_000_000, ownerSalary: opt.salary }, DEFAULT_ASSUMPTIONS);
    expect(opt.value).toBe(r.combinedNetWorth.value - r.deferredTaxEst.value);
  });
  it("스캔 격자 안의 어떤 급여도 최적값을 넘지 않는다", () => {
    const o = findOptimalSalary(sc4, DEFAULT_ASSUMPTIONS, "combinedNetWorth", 5_000_000);
    for (let s = 0; s <= 80_000_000; s += 5_000_000) {
      expect(searchValue(runCorporate({ ...sc4, ownerSalary: s }, DEFAULT_ASSUMPTIONS), "combinedNetWorth")).toBeLessThanOrEqual(o.value);
    }
  });
  it("이익 0이면 급여 0", () => {
    const o = findOptimalSalary({ ...sc4, accountingProfit: 0 }, DEFAULT_ASSUMPTIONS, "ownerDisposable");
    expect(o.salary).toBe(0);
  });
});
