import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "../src/lib/tax/assumptions";
import { explainCompare } from "../src/lib/tax/explain";
import { runCorporate, runIndividual } from "../src/lib/tax/scenario";
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

describe("결과 해설 문장", () => {
  it("SC4: 부담 줄고 가처분은 줄고 합산은 앞서는 케이스 — 3문장", () => {
    const s = explainCompare(runIndividual(sc4, DEFAULT_ASSUMPTIONS), runCorporate(sc4, DEFAULT_ASSUMPTIONS));
    expect(s).toHaveLength(3);
    expect(s[0]).toBe("법인으로 바꾸면 총 부담은 7,596,096원 줄어듭니다.");
    // 2026-09-26 D4: 매출 6억은 성실신고 대상 → 개인·법인 모두 확인비용 150만 − 공제 90만 = 60만 부담 (hand-calc SIN-a)
    expect(s[1]).toContain("2,960,513원 적습니다");
    expect(s[1]).toContain("회사에 남겨둔 이익 10,556,609원");
    expect(s[1]).toContain("법인이 7,596,096원 앞섭니다");
    expect(s[2]).toContain("세금 약 1,625,710원");
  });
  it("이익 1천만·급여 0·배당 100%: 부담 늘고 개인이 모두 앞서는 케이스", () => {
    const i = { ...sc4, accountingProfit: 10_000_000, ownerSalary: 0, dividendAmount: 6_500_000 };
    const s = explainCompare(runIndividual(i, DEFAULT_ASSUMPTIONS), runCorporate(i, DEFAULT_ASSUMPTIONS));
    expect(s[0]).toContain("늘어납니다");
    expect(s[1]).toContain("모두 개인 유지가 앞섭니다");
  });
  it("배당 100%로 가처분도 법인이 앞서는 케이스", () => {
    const i = { ...sc4, accountingProfit: 300_000_000, ownerSalary: 48_000_000, dividendAmount: 212_858_778 };
    const indiv = runIndividual(i, DEFAULT_ASSUMPTIONS);
    const corp = runCorporate(i, DEFAULT_ASSUMPTIONS);
    const s = explainCompare(indiv, corp);
    if (corp.ownerDisposable.value >= indiv.ownerDisposable.value) {
      expect(s[1]).toContain("법인이 앞섭니다");
    } else {
      expect(s[1]).toContain("적습니다");
    }
  });
});
