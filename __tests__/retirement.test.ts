import { describe, expect, it } from "vitest";
import {
  computeRetirementTax,
  estimateDeferredTax,
  execRetirementLimit,
  retirementMultipleEffect,
} from "../src/lib/tax/retirement-est";

describe("퇴직소득세 §48·§55② — hand-calc RT", () => {
  it("RT-a 1억 / 10년", () => {
    const r = computeRetirementTax(100_000_000, 10);
    expect(r.serviceDeduction.value).toBe(15_000_000);
    expect(r.convertedSalary.value).toBe(102_000_000);
    expect(r.convertedDeduction.value).toBe(62_600_000);
    expect(r.taxBase.value).toBe(39_400_000);
    expect(r.incomeTax.value).toBe(3_875_000);
    expect(r.localTax.value).toBe(387_500);
    expect(r.incomeTax.basis.some((b) => b.kind === "law" && b.article.includes("제55조 제2항"))).toBe(true);
    expect(r.serviceDeduction.basis.some((b) => b.kind === "law" && b.article.includes("제48조"))).toBe(true);
  });

  it("RT-b 2천만 / 5년", () => {
    const r = computeRetirementTax(20_000_000, 5);
    expect(r.serviceDeduction.value).toBe(5_000_000);
    expect(r.convertedSalary.value).toBe(36_000_000);
    expect(r.convertedDeduction.value).toBe(24_800_000);
    expect(r.incomeTax.value).toBe(280_000);
  });

  it("RT-c 근속연수공제 미달이면 0 (§48②)", () => {
    const r = computeRetirementTax(3_000_000, 5);
    expect(r.serviceDeduction.value).toBe(3_000_000);
    expect(r.incomeTax.value).toBe(0);
  });

  it("RT-d 1년 미만은 1년", () => {
    expect(computeRetirementTax(10_000_000, 0.3).serviceDeduction.value).toBe(1_000_000);
  });

  it("RT-e 근속 25년 구간", () => {
    // 4,000만 + 300만 × 5 = 5,500만
    expect(computeRetirementTax(100_000_000, 25).serviceDeduction.value).toBe(55_000_000);
  });
});

describe("임원 퇴직소득 한도 §22③ (2020년 이후분)", () => {
  it("급여 4,800만 × 1/10 × 10년 × 2 = 9,600만", () => {
    const l = execRetirementLimit(48_000_000, 10);
    expect(l.value).toBe(96_000_000);
    expect(l.basis.some((b) => b.kind === "law" && b.article.includes("제22조 제3항"))).toBe(true);
  });
});

describe("2차 과세 — 배당 vs 퇴직 경로", () => {
  const common = { otherComprehensive: 35_850_000, deductions: 5_732_352 };

  it("퇴직 미설정이면 배당 경로만", () => {
    const d = estimateDeferredTax(11_156_609, common.otherComprehensive, common.deductions, {
      retirementPlan: false,
      salary: 48_000_000,
      serviceYears: 10,
    });
    expect(d.value).toBeGreaterThan(0);
    expect(d.label).toContain("배당");
  });

  it("퇴직 설정 시 경로별 최저값 — 유보 1,116만은 근속공제 미달로 0", () => {
    const d = estimateDeferredTax(11_156_609, common.otherComprehensive, common.deductions, {
      retirementPlan: true,
      salary: 48_000_000,
      serviceYears: 10,
    });
    expect(d.value).toBe(0);
    expect(d.steps.some((s) => s.includes("배당 경로"))).toBe(true);
    expect(d.steps.some((s) => s.includes("퇴직 경로"))).toBe(true);
  });

  it("한도 초과분은 근로소득으로 과세 — 유보 1억, 한도 9,600만", () => {
    const d = estimateDeferredTax(100_000_000, 0, 1_500_000, {
      retirementPlan: true,
      salary: 48_000_000,
      serviceYears: 10,
    });
    // 퇴직 경로: 9,600만 퇴직소득세 + 초과 400만 근로소득 합산. 배당 경로보다 작아야 한다.
    expect(d.steps.some((s) => s.includes("초과") && s.includes("근로소득"))).toBe(true);
    const divOnly = estimateDeferredTax(100_000_000, 0, 1_500_000, {
      retirementPlan: false,
      salary: 48_000_000,
      serviceYears: 10,
    });
    expect(d.value).toBeLessThan(divOnly.value);
  });
});

describe("정관 퇴직급여 배수 (Josh 2026-09-26)", () => {
  const common = { salary: 48_000_000, serviceYears: 10, otherComprehensive: 0, deductions: 1_500_000 };

  it("3배: 유보 1.5억이면 한도 9,600만 초과 4,800만 구간이 비용 인정 증가", () => {
    const e = retirementMultipleEffect({ ...common, retained: 150_000_000, multiple: 3, corpTaxBase: 100_000_000 });
    // 손금 한도 1.44억 − 소득세 한도 9,600만 = 4,800만 (유보 1.5억 범위 내)
    expect(e.deductibleIncrease.value).toBe(48_000_000);
    // 과표 1억 → 5,200만: 법인세 10%×4,800만 = 480만 + 지방 48만
    expect(e.corpTaxSaving.value).toBe(5_280_000);
    expect(e.excessEarnedTax.value).toBeGreaterThan(0);
    expect(e.deductibleIncrease.basis.some((b) => b.kind === "law" && b.article.includes("제44조"))).toBe(true);
  });

  it("3배: 유보가 소득세 한도 이하면 증가분 0", () => {
    const e = retirementMultipleEffect({ ...common, retained: 50_000_000, multiple: 3, corpTaxBase: 100_000_000 });
    expect(e.deductibleIncrease.value).toBe(0);
    expect(e.corpTaxSaving.value).toBe(0);
    expect(e.excessEarnedTax.value).toBe(0);
  });

  it("3배: 유보가 3배 한도를 넘으면 증가분은 1배분(4,800만)까지", () => {
    const e = retirementMultipleEffect({ ...common, retained: 300_000_000, multiple: 3, corpTaxBase: 100_000_000 });
    expect(e.deductibleIncrease.value).toBe(48_000_000);
  });

  it("estimateDeferredTax: 3배는 2배보다 퇴직 경로 부담이 작거나 같다", () => {
    const two = estimateDeferredTax(150_000_000, 0, 1_500_000, { retirementPlan: true, salary: 48_000_000, serviceYears: 10, multiple: 2, corpTaxBase: 100_000_000 });
    const three = estimateDeferredTax(150_000_000, 0, 1_500_000, { retirementPlan: true, salary: 48_000_000, serviceYears: 10, multiple: 3, corpTaxBase: 100_000_000 });
    expect(three.value).toBeLessThanOrEqual(two.value);
    expect(three.steps.some((s) => s.includes("정관 3배"))).toBe(true);
  });

  it("배수 생략(기존 호출)은 2배와 동일", () => {
    const d = estimateDeferredTax(100_000_000, 0, 1_500_000, { retirementPlan: true, salary: 48_000_000, serviceYears: 10 });
    const two = estimateDeferredTax(100_000_000, 0, 1_500_000, { retirementPlan: true, salary: 48_000_000, serviceYears: 10, multiple: 2 });
    expect(d.value).toBe(two.value);
  });

  it("1배는 손금불산입 안내만, 금액은 2배와 동일", () => {
    const one = estimateDeferredTax(100_000_000, 0, 1_500_000, { retirementPlan: true, salary: 48_000_000, serviceYears: 10, multiple: 1 });
    const two = estimateDeferredTax(100_000_000, 0, 1_500_000, { retirementPlan: true, salary: 48_000_000, serviceYears: 10, multiple: 2 });
    expect(one.value).toBe(two.value);
    expect(one.steps.some((s) => s.includes("손금불산입"))).toBe(true);
  });
});

// 연재 9화 독립 계산기 — 기존 1화 퇴직 경로 회귀 테스트는 위에 보존.
import { computeRetirement } from "@/lib/tax/retirement/engine";
import { DEFAULT_RETIREMENT, validateRetirement, type RetirementInput } from "@/lib/tax/retirement/input";
import { decodeRetirement, encodeRetirement } from "@/lib/tax/retirement/share";

const employee = (amount: number, serviceMonths = 144): RetirementInput => ({ ...DEFAULT_RETIREMENT, amount, serviceMonths });
const payload = (d: unknown, v = 1, r = "old") => btoa(JSON.stringify({ v, r, d })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("퇴직소득세 독립 손계산 — retirement-hand-calc-fixtures.md", () => {
  it.each([
    [28_000_000, 8_000_000, 8_000_000, 0, 0, 0, 0],
    [90_000_000, 70_000_000, 45_200_000, 24_800_000, 2_460_000, 246_000, 2_706_000],
    [120_000_000, 100_000_000, 61_700_000, 38_300_000, 4_485_000, 448_500, 4_933_500],
    [320_000_000, 300_000_000, 151_700_000, 148_300_000, 36_465_000, 3_646_500, 40_111_500],
    [420_000_000, 400_000_000, 186_700_000, 213_300_000, 61_114_000, 6_111_400, 67_225_400],
    [720_000_000, 700_000_000, 291_700_000, 408_300_000, 137_380_000, 13_738_000, 151_118_000],
    [1_020_000_000, 1_000_000_000, 396_700_000, 603_300_000, 217_446_000, 21_744_600, 239_190_600],
    [2_020_000_000, 2_000_000_000, 746_700_000, 1_253_300_000, 498_045_000, 49_804_500, 547_849_500],
  ])("12년·퇴직금 %i원의 공제부터 지방세까지", (amount, converted, deduction, base, tax, local, total) => {
    const r = computeRetirement(employee(amount));
    expect([r.serviceDeduction.value, r.convertedPay.value, r.convertedDeduction.value, r.taxBase.value, r.tax.value, r.localTax.value, r.total.value])
      .toEqual([20_000_000, converted, deduction, base, tax, local, total]);
  });

  it("10년·1억원: 환산급여 1억200만원, 공제 6260만원, 세금 역환산·끝수", () => {
    const r = computeRetirement(employee(100_000_000, 120));
    expect([r.serviceDeduction.value, r.convertedPay.value, r.convertedDeduction.value, r.taxBase.value, r.convertedTax.value])
      .toEqual([15_000_000, 102_000_000, 62_600_000, 39_400_000, 4_650_000]);
    expect([r.tax.value, r.localTax.value, r.total.value, r.netRetirement.value]).toEqual([3_875_000, 387_500, 4_262_500, 95_737_500]);
  });

  it.each([[60, 5_000_000], [61, 7_000_000], [120, 15_000_000], [121, 17_500_000], [240, 40_000_000], [241, 43_000_000]])("근속 %i개월: 올림·공제 경계", (months, deduction) => {
    expect(computeRetirement(employee(100_000_000, months)).serviceDeduction.value).toBe(deduction);
  });

  it("1개월·퇴직금 50만원: 공제는 소득금액까지만", () => {
    const r = computeRetirement(employee(500_000, 1));
    expect([r.serviceYears.value, r.serviceDeduction.value, r.total.value]).toEqual([1, 500_000, 0]);
  });

  it.each([[1_000_000, 0, 0], [1_708_333, 999, 0], [1_708_334, 1_000, 1_000]])("소액 부징수 경계: 퇴직금 %i원", (amount, assessed, withheld) => {
    const r = computeRetirement(employee(amount, 12));
    expect([r.assessedTax.value, r.tax.value]).toEqual([assessed, withheld]);
  });

  it("임원: 2012~2019 96개월 3배 + 2020 이후 72개월 2배, 초과 1억4000만원", () => {
    const r = computeRetirement({ ...employee(500_000_000, 168), isExecutive: true, months2012To2019: 96, monthsFrom2020: 72, annualSalary2019: 100_000_000, annualSalaryAtRetirement: 100_000_000 });
    expect([r.limit2012.value, r.limit2020.value, r.executiveLimit?.value, r.employmentIncome.value, r.retirementIncome.value])
      .toEqual([240_000_000, 120_000_000, 360_000_000, 140_000_000, 360_000_000]);
    expect([r.serviceDeduction.value, r.taxBase.value, r.tax.value, r.localTax.value, r.total.value, r.netRetirement.value])
      .toEqual([25_000_000, 141_228_571, 39_654_990, 3_965_490, 43_620_480, 316_379_520]);
  });

  it("임원: 2011 이전분은 총퇴직금의 월수 비례, 한도에 합산", () => {
    const r = computeRetirement({ ...employee(300_000_000, 360), isExecutive: true, monthsBefore2012: 180, months2012To2019: 96, monthsFrom2020: 84, annualSalary2019: 50_000_000, annualSalaryAtRetirement: 50_000_000 });
    expect([r.pre2012Income.value, r.executiveLimit?.value, r.employmentIncome.value, r.retirementIncome.value]).toEqual([150_000_000, 340_000_000, 0, 300_000_000]);
  });

  it("경계 바로 위에서도 10원 절사와 과표 1원 미만 절사를 유지한다", () => {
    const r = computeRetirement(employee(100_000_001, 120));
    expect(r.taxBase.value).toBe(39_400_000);
    expect([r.tax.value, r.localTax.value]).toEqual([3_875_000, 387_500]);
  });

  it("모든 결과 숫자에 계산 과정·근거가 있다", () => {
    const r = computeRetirement(employee(100_000_000, 120));
    for (const t of Object.values(r)) {
      if (t && typeof t === "object" && "value" in t) {
        expect(t.steps.length).toBeGreaterThan(0);
        expect(t.basis.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("입력과 공유 링크", () => {
  it.each([NaN, Infinity, -1, 1.5])("유효하지 않은 금액 %s 거부", (amount) => {
    expect(validateRetirement(employee(amount)).length).toBeGreaterThan(0);
    expect(() => computeRetirement(employee(amount))).toThrow();
  });
  it("근속기간 없음·임원 기간 합계 오류를 거부한다", () => {
    expect(validateRetirement(employee(0, 0)).length).toBeGreaterThan(0);
    expect(validateRetirement({ ...employee(100_000_000), isExecutive: true }).length).toBeGreaterThan(0);
  });
  it("공유 링크는 입력·버전을 왕복한다", () => {
    const input = employee(100_000_000, 120);
    expect(decodeRetirement(encodeRetirement(input))).toEqual({ ok: true, input, ratesChanged: false });
    expect(decodeRetirement(payload(input))).toEqual({ ok: true, input, ratesChanged: true });
  });
  it.each(["???", payload({}), payload(employee(-1)), payload({ ...employee(0), isExecutive: "false" }), payload(null)])("손상된 링크를 기본값으로 계산하지 않는다", (code) => {
    expect(decodeRetirement(code)).toEqual({ ok: false, reason: "손상된 링크" });
  });
  it("미래 스키마는 만료된 형식으로 분리한다", () => {
    expect(decodeRetirement(payload(employee(0), 99))).toEqual({ ok: false, reason: "만료된 형식" });
  });
});
