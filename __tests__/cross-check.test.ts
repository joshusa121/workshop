/**
 * 공식 계산기 실측값 고정 (2026-09-14, Aside 브라우저로 직접 입력·판독).
 * 출처·스크린샷: docs/verified/manual-cross-check.md, artifacts/cross-check/
 * 여기 기대값은 손계산이 아니라 홈택스·4insure·건보공단 화면에 표시된 숫자다.
 */
import { describe, expect, it } from "vitest";
import { earnedIncomeAmount, earnedIncomeTaxCredit, selfBasicDeduction, standardTaxCredit } from "../src/lib/tax/deductions";
import { computeOwnerIncomeTax } from "../src/lib/tax/dividend";
import { employeeInsurance, npsContribution, regionalInsurance } from "../src/lib/tax/insurance";
import { computeRetirementTax } from "../src/lib/tax/retirement-est";

describe("홈택스 퇴직소득 세액계산 (2026년 귀속)", () => {
  it("RT-a 1억 / 근속 10년 → 산출 3,875,000 / 지방 387,500", () => {
    const r = computeRetirementTax(100_000_000, 10);
    expect(r.serviceDeduction.value).toBe(15_000_000);
    expect(r.convertedSalary.value).toBe(102_000_000);
    expect(r.convertedDeduction.value).toBe(62_600_000);
    expect(r.taxBase.value).toBe(39_400_000);
    expect(r.incomeTax.value).toBe(3_875_000);
    expect(r.localTax.value).toBe(387_500);
  });
  it("RT-b 2천만 / 근속 5년 → 산출 280,000 / 지방 28,000", () => {
    const r = computeRetirementTax(20_000_000, 5);
    expect(r.taxBase.value).toBe(11_200_000);
    expect(r.incomeTax.value).toBe(280_000);
    expect(r.localTax.value).toBe(28_000);
  });
});

describe("홈택스 근로소득 세액비교 (본인 기본공제만, 2025 귀속 = 2026 동일 규정)", () => {
  const run = (salary: number) => {
    const earned = earnedIncomeAmount(salary).value;
    const tax = computeOwnerIncomeTax({
      nonFinancialIncome: earned,
      deductions: selfBasicDeduction().value,
      dividend: 0,
      taxCredits: 0,
    });
    const credit = earnedIncomeTaxCredit(tax.calculatedTax.value, salary).value;
    const std = standardTaxCredit(true).value;
    return { earned, taxBase: earned - selfBasicDeduction().value, calculated: tax.calculatedTax.value, credit, std, determined: tax.calculatedTax.value - credit - std };
  };
  it("총급여 4,800만 → 근로소득금액 35,850,000 / 과표 34,350,000 / 산출 3,892,500 / 근로세액공제 660,000 / 결정 3,102,500", () => {
    const r = run(48_000_000);
    expect(r.earned).toBe(35_850_000);
    expect(r.taxBase).toBe(34_350_000);
    expect(r.calculated).toBe(3_892_500);
    expect(r.credit).toBe(660_000);
    expect(r.std).toBe(130_000);
    expect(r.determined).toBe(3_102_500);
  });
  it("총급여 1억 → 근로소득금액 85,250,000 / 과표 83,750,000 / 산출 14,340,000 / 근로세액공제 500,000 / 결정 13,710,000", () => {
    const r = run(100_000_000);
    expect(r.earned).toBe(85_250_000);
    expect(r.taxBase).toBe(83_750_000);
    expect(r.calculated).toBe(14_340_000);
    expect(r.credit).toBe(500_000);
    expect(r.determined).toBe(13_710_000);
  });
});

describe("4대사회보험 정보연계센터 직장 모의계산 (2026, 근로자 부담 월액)", () => {
  // 공단은 월 단위 10원 절사. 엔진은 연 단위 → 월 환산 시 ±10원 허용
  const monthly = (annual: number) => annual / 12;
  it("월 400만: 연금 190,000 / 건보 143,800 / 요양 18,890", () => {
    const e = employeeInsurance(48_000_000);
    expect(monthly(e.npsEmployee.value)).toBeCloseTo(190_000, -1);
    expect(monthly(e.nhisEmployee.value)).toBeCloseTo(143_800, -1);
    expect(Math.abs(monthly(e.ltcEmployee.value) - 18_890)).toBeLessThanOrEqual(10);
  });
  it("월 1,000만: 건보 359,500 / 요양 47,240 (건보 상한 미도달)", () => {
    const e = employeeInsurance(120_000_000);
    expect(monthly(e.nhisEmployee.value)).toBeCloseTo(359_500, -1);
    expect(Math.abs(monthly(e.ltcEmployee.value) - 47_240)).toBeLessThanOrEqual(10);
    // 연금: 상반기 637만·하반기 659만 상한 → 연 3,693,600 (공단 9월 기준 월 313,020 = 659만 상한)
    expect(e.npsEmployee.value).toBe(3_693_600);
  });
});

describe("건보공단 지역보험료 모의계산 (2026, 재산 0, 건보+요양 월액)", () => {
  const cases: [number, number][] = [
    [48_000_000, 325_390],
    [80_000_000, 542_310],
    [200_000_000, 1_355_790],
    [500_000_000, 3_389_490],
  ];
  for (const [income, official] of cases) {
    it(`사업소득 ${income.toLocaleString("ko-KR")} → ${official.toLocaleString("ko-KR")}`, () => {
      const r = regionalInsurance(income);
      const nhisLtcMonthly = (r.value - npsContribution(income, "full").amount) / 12;
      expect(Math.abs(nhisLtcMonthly - official)).toBeLessThanOrEqual(10);
    });
  }
});
