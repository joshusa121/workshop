import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "../src/lib/tax/assumptions";
import { conversionCosts } from "../src/lib/tax/conversion/cost";
import { conversionPayback } from "../src/lib/tax/conversion/payback";
import type { ScenarioInput } from "../src/lib/tax/scenario-input";

const base: ScenarioInput = {
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

describe("지방교육세 — 등록면허세의 20% (§151①2호)", () => {
  it("서울 순자산 1.6억 → 1,920,000 + 384,000 = 2,304,000", () => {
    const c = conversionCosts(base, DEFAULT_ASSUMPTIONS);
    expect(c.registrationTaxWithEducation.value).toBe(2_304_000);
    expect(c.registrationTaxWithEducation.basis.some((b) => b.kind === "law" && b.article.includes("제151조"))).toBe(true);
    expect(c.registrationTax.value).toBe(1_920_000); // 본세는 그대로
  });
});

describe("회수 기간 — hand-calc PB", () => {
  it("PB-a SC4 서울: 일회성 4,304,000 / 연간 7,596,096 → 0.6년", () => {
    const p = conversionPayback(base, DEFAULT_ASSUMPTIONS);
    expect(p.oneTimeCost.value).toBe(4_304_000);
    expect(p.annualGain.value).toBe(7_596_096);
    expect(p.years).toBe(0.6);
    expect(p.oneTimeCost.basis.some((b) => b.kind === "law")).toBe(true);
    expect(p.annualGain.basis.some((b) => b.kind === "assumption")).toBe(true);
  });
  it("PB-b 연간 이득이 음수면 years null", () => {
    // 이익 1천만·급여 0·배당 100%: 법인세+법인 기장료(240만)가 개인 부담을 넘어 불리
    const p = conversionPayback({ ...base, accountingProfit: 10_000_000, ownerSalary: 0, dividendAmount: 6_500_000 }, DEFAULT_ASSUMPTIONS);
    expect(p.annualGain.value).toBeLessThan(0);
    expect(p.years).toBeNull();
    expect(p.note).toContain("회수 없음");
  });
  it("PB-c 일회성 비용 0이면 0년", () => {
    const p = conversionPayback(
      { ...base, workplace: { sido: "부산광역시" }, assets: { total: 10_000_000, realEstate: 0, housing: 0 }, liabilities: 10_000_000 },
      DEFAULT_ASSUMPTIONS,
    );
    // 순자산 0 → 등록면허세 최저 112,500 + 교육세 22,500 = 135,000. 연간 이득 대비 매우 작아 0.0년으로 반올림
    expect(p.oneTimeCost.value).toBe(135_000);
    expect(p.years).not.toBeNull();
    expect(p.years).toBeLessThan(0.1);
  });
});
