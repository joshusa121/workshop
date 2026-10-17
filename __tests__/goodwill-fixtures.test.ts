import { describe, expect, it } from "vitest";
import { runGoodwill } from "../src/lib/tax/goodwill/net-effect";

/** docs/verified/goodwill-hand-calc-fixtures.md G1~G5 */
const CASES = [
  {
    id: "G1 기본",
    input: { netIncomes: [150e6, 120e6, 100e6] as [number, number, number], equity: 200e6, otherComprehensiveIncome: 0, corpTaxBase: 200e6, withRealEstate: false },
    goodwill: 173_744_393, otherIncomeAmount: 69_497_757, withholding: 15_289_500, personalTax: 11_615_400,
    amort: 34_748_878, annualSaving: 3_822_380, fiveYear: 19_111_900, net: 7_496_500, tone: "positive",
  },
  {
    id: "G2 초과이익 음수",
    input: { netIncomes: [20e6, 20e6, 20e6] as [number, number, number], equity: 500e6, otherComprehensiveIncome: 0, corpTaxBase: 200e6, withRealEstate: false },
    goodwill: 0, otherIncomeAmount: 0, withholding: 0, personalTax: 0, amort: 0, annualSaving: 0, fiveYear: 0, net: 0, tone: "none",
  },
  {
    id: "G3 자기자본 0",
    input: { netIncomes: [100e6, 100e6, 100e6] as [number, number, number], equity: 0, otherComprehensiveIncome: 0, corpTaxBase: 200e6, withRealEstate: false },
    goodwill: 189_539_338, otherIncomeAmount: 75_815_735, withholding: 16_679_450, personalTax: 13_283_340,
    amort: 37_907_867, annualSaving: 4_169_870, fiveYear: 20_849_350, net: 7_566_010, tone: "positive",
  },
  {
    id: "G4 고액·최고구간",
    input: { netIncomes: [550e6, 500e6, 450e6] as [number, number, number], equity: 300e6, otherComprehensiveIncome: 500e6, corpTaxBase: 500e6, withRealEstate: false },
    goodwill: 865_562_979, otherIncomeAmount: 346_225_191, withholding: 76_169_530, personalTax: 159_923_030,
    amort: 173_112_595, annualSaving: 38_084_780, fiveYear: 190_423_900, net: 30_500_870, tone: "positive",
  },
  {
    id: "G5 법인 과표 2억 경계",
    input: { netIncomes: [60e6, 60e6, 60e6] as [number, number, number], equity: 100e6, otherComprehensiveIncome: 0, corpTaxBase: 210e6, withRealEstate: false },
    goodwill: 75_815_735, otherIncomeAmount: 30_326_294, withholding: 6_671_770, personalTax: 3_370_330,
    amort: 15_163_147, annualSaving: 2_767_960, fiveYear: 13_839_800, net: 10_469_470, tone: "positive",
  },
];

describe("goodwill 손계산 fixture", () => {
  for (const c of CASES) {
    it(c.id, () => {
      const r = runGoodwill(c.input);
      expect(r.valuation.goodwill.value).toBe(c.goodwill);
      expect(r.personal.otherIncomeAmount.value).toBe(c.otherIncomeAmount);
      expect(r.personal.withholding.value).toBe(c.withholding);
      expect(r.personal.personalTax.value).toBe(c.personalTax);
      expect(r.corp.annualAmortization.value).toBe(c.amort);
      expect(r.corp.annualSaving.value).toBe(c.annualSaving);
      expect(r.corp.fiveYearNominal.value).toBe(c.fiveYear);
      expect(r.corp.fiveYearPresent.value).toBe(c.fiveYear); // 할인율 0 → 명목과 같다
      expect(r.netEffect.value).toBe(c.net);
      expect(r.verdict.tone).toBe(c.tone);
      expect(r.personal.settlement).toBe(c.personalTax - c.withholding);
      expect(r.cashFlow.corpOutflow.value).toBe(c.goodwill);
      expect(r.cashFlow.ownerInflow.value).toBe(c.goodwill - c.withholding);
    });
  }

  it("할인율 10%면 현가 < 명목", () => {
    const r = runGoodwill({ ...CASES[0].input, discountRate: 0.1 });
    expect(r.corp.fiveYearPresent.value).toBeLessThan(r.corp.fiveYearNominal.value);
    expect(r.corp.fiveYearPresent.value).toBe(Math.round(3_822_380 * 3.7907867694084474));
  });

  it("기타소득금액 300만원 이하면 분리과세 선택 — 원천징수·종합과세 중 작은 쪽", () => {
    // 평가액 500만 → 기타소득금액 200만
    const r = runGoodwill({ netIncomes: [2_637_880, 2_637_880, 2_637_880], equity: 0, otherComprehensiveIncome: 300e6, corpTaxBase: 100e6, withRealEstate: false });
    expect(r.personal.otherIncomeAmount.value).toBeLessThanOrEqual(3_000_000);
    expect(r.personal.separateTaxEligible).toBe(true);
    expect(r.personal.personalTax.value).toBe(Math.min(r.personal.withholding.value, r.personal.comprehensiveExtra.value));
    expect(r.personal.personalTax.value).toBe(r.personal.withholding.value); // 타소득 3억 → 종합과세 40%대 > 22%
  });

  it("부동산 함께 양도 → outOfScope", () => {
    expect(runGoodwill({ ...CASES[0].input, withRealEstate: true }).outOfScope).toBe(true);
    expect(runGoodwill(CASES[0].input).outOfScope).toBe(false);
  });

  it("법인 과표가 상각비보다 작으면 절세는 과표 한도", () => {
    const r = runGoodwill({ ...CASES[2].input, corpTaxBase: 10e6 }); // 상각 3,790만 > 과표 1,000만
    expect(r.corp.annualSaving.value).toBe(1_100_000); // 1,000만 × 10% × 1.1
  });
});
