import { describe, expect, it } from "vitest";
import { personalTaxOnGoodwill } from "../src/lib/tax/goodwill/income-tax-path";
import { runGoodwill } from "../src/lib/tax/goodwill/net-effect";

/**
 * Phase 3 최종 감사(2026-09-26) — fixture G1~G5 밖의 독립 손계산.
 * 기대값 출처: artifacts/goodwill/audit/hand_calc.py (엔진 미사용, 분수 정확 연산) → hand_calc_output.json.
 * 보고서: docs/verified/goodwill-final-audit.md 2절.
 */
type Tuple3 = [number, number, number];
const base = { withRealEstate: false, discountRate: 0 };

const CASES = [
  {
    id: "A1 순손익 감소 3억/2억/1억·자기자본 1억·법인 과표 3억",
    input: { ...base, netIncomes: [300e6, 200e6, 100e6] as Tuple3, equity: 100e6, otherComprehensiveIncome: 0, corpTaxBase: 300e6 },
    goodwill: 404_350_588, amount: 161_740_235, withholding: 35_582_840, extra: 45_046_400, separate: false,
    personalTax: 45_046_400, amort: 80_870_117, annualSaving: 17_791_440, fiveYear: 88_957_200, net: 43_910_800,
  },
  {
    id: "A2a 소액 — 기타소득금액 300만 이하, 분리과세(원천징수 종결)가 유리",
    input: { ...base, netIncomes: [10e6, 10e6, 10e6] as Tuple3, equity: 31e6, otherComprehensiveIncome: 80e6, corpTaxBase: 100e6 },
    goodwill: 7_202_494, amount: 2_880_997, withholding: 633_800, extra: 760_570, separate: true,
    personalTax: 633_800, amort: 1_440_498, annualSaving: 158_460, fiveYear: 792_300, net: 158_500,
  },
  {
    id: "A2b 소액 — 기타소득금액 300만 이하, 종합과세 합산이 유리(환급)",
    input: { ...base, netIncomes: [10e6, 10e6, 10e6] as Tuple3, equity: 31e6, otherComprehensiveIncome: 0, corpTaxBase: 100e6 },
    goodwill: 7_202_494, amount: 2_880_997, withholding: 633_800, extra: 91_130, separate: true,
    personalTax: 91_130, amort: 1_440_498, annualSaving: 158_460, fiveYear: 792_300, net: 701_170,
  },
  {
    id: "A3 법인 과표 200억 경계 — 상각 전 205억(22%)·상각 후 194.9억(20%)",
    input: { ...base, netIncomes: [3_000e6, 2_800e6, 2_600e6] as Tuple3, equity: 1_000e6, otherComprehensiveIncome: 0, corpTaxBase: 20_500e6 },
    goodwill: 5_054_382_359, amount: 2_021_752_943, withholding: 444_785_630, extra: 927_491_200, separate: false,
    personalTax: 927_491_200, amort: 1_010_876_471, annualSaving: 233_392_830, fiveYear: 1_166_964_150, net: 239_472_950,
  },
];

describe("goodwill 감사 — 독립 손계산 신규 케이스", () => {
  for (const c of CASES) {
    it(c.id, () => {
      const r = runGoodwill(c.input);
      expect(r.valuation.goodwill.value).toBe(c.goodwill);
      expect(r.personal.otherIncomeAmount.value).toBe(c.amount);
      expect(r.personal.withholding.value).toBe(c.withholding);
      expect(r.personal.comprehensiveExtra.value).toBe(c.extra);
      expect(r.personal.separateTaxEligible).toBe(c.separate);
      expect(r.personal.personalTax.value).toBe(c.personalTax);
      expect(r.personal.settlement).toBe(c.personalTax - c.withholding);
      expect(r.corp.annualAmortization.value).toBe(c.amort);
      expect(r.corp.annualSaving.value).toBe(c.annualSaving);
      expect(r.corp.fiveYearNominal.value).toBe(c.fiveYear);
      expect(r.netEffect.value).toBe(c.net);
      expect(r.verdict.tone).toBe("positive");
    });
  }

  it("300만원 경계 ±1원 — 기타소득금액 3,000,000은 분리과세 선택, 3,000,001은 종합과세 필수", () => {
    const at = personalTaxOnGoodwill(7_500_000, 80e6);
    expect(at.otherIncomeAmount.value).toBe(3_000_000);
    expect(at.separateTaxEligible).toBe(true);
    expect(at.personalTax.value).toBe(660_000);
    const over = personalTaxOnGoodwill(7_500_003, 80e6);
    expect(over.otherIncomeAmount.value).toBe(3_000_001);
    expect(over.separateTaxEligible).toBe(false);
    expect(over.personalTax.value).toBe(792_000);
  });
});

describe("goodwill 감사 — 극단값", () => {
  it("전부 0원 → 평가액 0, 판정 none, 예외 없음", () => {
    const r = runGoodwill({ ...base, netIncomes: [0, 0, 0], equity: 0, otherComprehensiveIncome: 0, corpTaxBase: 0 });
    expect(r.valuation.goodwill.value).toBe(0);
    expect(r.netEffect.value).toBe(0);
    expect(r.verdict.tone).toBe("none");
  });

  it("적자 연도 포함 — 가중평균이 음수면 0 (상증령 §56① 후단)", () => {
    const r = runGoodwill({ ...base, netIncomes: [-300e6, 100e6, 100e6], equity: 0, otherComprehensiveIncome: 0, corpTaxBase: 100e6 });
    expect(r.valuation.weightedAvg.value).toBe(0);
    expect(r.valuation.goodwill.value).toBe(0);
  });

  it("적자 연도 포함 — 가중평균이 양수면 적자를 그대로 반영", () => {
    // (−1억×3 + 3억×2 + 3억×1) ÷ 6 = 1억 → 초과이익 5천만 → 189,539,338 (fixture G3과 같은 초과이익)
    const r = runGoodwill({ ...base, netIncomes: [-100e6, 300e6, 300e6], equity: 0, otherComprehensiveIncome: 0, corpTaxBase: 200e6 });
    expect(r.valuation.weightedAvg.value).toBe(100e6);
    expect(r.valuation.goodwill.value).toBe(189_539_338);
  });

  it("100억 — 순손익 100억×3·자기자본 0, 숫자가 유한하고 부호가 맞다", () => {
    const r = runGoodwill({ ...base, netIncomes: [10_000e6, 10_000e6, 10_000e6], equity: 0, otherComprehensiveIncome: 0, corpTaxBase: 10_000e6 });
    // 50억 × 610510/161051 = 18,953,933,847.66 → 18,953,933,847
    expect(r.valuation.goodwill.value).toBe(18_953_933_847);
    expect(Number.isFinite(r.netEffect.value)).toBe(true);
    expect(r.personal.personalTax.value).toBeGreaterThan(0);
  });

  it("법인 과표보다 상각비가 크면 절세는 상각 전 세금 전액까지만", () => {
    const r = runGoodwill({ ...base, netIncomes: [300e6, 300e6, 300e6], equity: 0, otherComprehensiveIncome: 0, corpTaxBase: 50e6 });
    expect(r.corp.annualSaving.value).toBe(5_500_000); // 5천만 × 10% + 지방 10%
  });
});

describe("goodwill 감사 — 발견 버그 재현 (고치면 it.fails를 it로 바꾼다)", () => {
  // 현가 합계가 정확히 정수(초과이익이 161,051 = 11^5의 배수)일 때 부동소수 합이 x.9999…가 되어 원 미만 버림에서 1원 모자란다.
  // 재현: 순손익 322,102만원 × 3년, 자기자본 0 → 초과이익 1,610,510,000 → 정확한 현가 합계 6,105,100,000
  it("현가 합계가 정수이면 그 값 그대로 (수정 전 엔진 6,105,099,999)", () => {
    const r = runGoodwill({ ...base, netIncomes: [3_221_020_000, 3_221_020_000, 3_221_020_000], equity: 0, otherComprehensiveIncome: 0, corpTaxBase: 0 });
    expect(r.valuation.goodwill.value).toBe(6_105_100_000);
  });
});

describe("goodwill 감사 — 부동산 동반 양도(범위 밖)", () => {
  it("범위 밖이면 순효과가 양수여도 '검토할 가치'라고 결론 내리지 않는다", () => {
    const r = runGoodwill({ ...CASES[0].input, withRealEstate: true });
    expect(r.netEffect.value).toBeGreaterThan(0); // 순효과는 양수인 사례
    expect(r.outOfScope).toBe(true);
    expect(r.verdict.tone).toBe("none");
    expect(r.verdict.text).toContain("판단할 수 없습니다");
  });
});
