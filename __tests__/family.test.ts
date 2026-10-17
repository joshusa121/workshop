import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "../src/lib/tax/assumptions";
import { conversionPayback } from "../src/lib/tax/conversion/payback";
import { explainCompare } from "../src/lib/tax/explain";
import { findOptimalSalary, searchValue } from "../src/lib/tax/optimize";
import { familyWorkerCost, runCorporate, runIndividual } from "../src/lib/tax/scenario";
import type { ScenarioInput } from "../src/lib/tax/scenario-input";

const sc4: ScenarioInput = {
  revenue: 300_000_000,
  accountingProfit: 80_000_000,
  taxAdjustment: 0,
  industryGroup: "서비스임대",
  workplace: { sido: "서울특별시" },
  assets: { total: 200_000_000, realEstate: 50_000_000, housing: 0 },
  liabilities: 40_000_000,
  ownerSalary: 48_000_000,
  dividendAmount: 11_156_609,
  retirementPlan: false,
  retirementMultiple: 2,
  familyWorkers: 0,
  familySalaryEach: 36_000_000,
  familyLivesSeparately: false,  plansRealEstatePurchase: false,
  nonTaxReasons: false,
  yellowUmbrellaEnabled: false,
  startupReliefRate: 0,
  startupReliefYearsLeft: 3,
  bookkeepingType: "복식부기",
  sincereFilingConfirmCost: 0,
  voluntaryEmploymentIns: false,
  voluntaryWorkersComp: false,
  personalContext: { otherIncome: 0 },
};

describe("가족 급여 — hand-calc FAM-a (1명 3,600만)", () => {
  it("1인 근로소득세·보험·실수령", () => {
    const f = familyWorkerCost(36_000_000);
    expect(f.employerInsurance).toBe(3_174_264);
    expect(f.employeeInsurance).toBe(3_174_264);
    expect(f.incomeTax).toBe(995_360);
    expect(f.localTax).toBe(99_530);
    expect(f.burden).toBe(4_269_154);
    expect(f.disposable).toBe(31_730_846);
    expect(f.corpCost).toBe(39_174_264);
  });

  it("법인 시나리오: 가족 행이 채워지고 법인 비용이 39,174,264 늘어난다", () => {
    const base = runCorporate(sc4, DEFAULT_ASSUMPTIONS);
    const fam = runCorporate({ ...sc4, familyWorkers: 1 }, DEFAULT_ASSUMPTIONS);
    expect(base.familyBurden.value).toBe(0);
    expect(fam.familyBurden.value).toBe(4_269_154);
    expect(fam.familyDisposable.value).toBe(31_730_846);
    expect(fam.corpRetained.value).toBeLessThan(base.corpRetained.value);
    // 합산 순자산은 기존 정의(대표 가처분 + 유보) 그대로 — 가족 실수령은 넣지 않는다
    expect(fam.combinedNetWorth.value).toBe(fam.ownerDisposable.value + fam.corpRetained.value);
    expect(fam.familyBurden.basis.some((b) => b.kind === "assumption")).toBe(true);
  });

  it("2명이면 1인 값의 2배", () => {
    const fam = runCorporate({ ...sc4, familyWorkers: 2 }, DEFAULT_ASSUMPTIONS);
    expect(fam.familyBurden.value).toBe(4_269_154 * 2);
    expect(fam.familyDisposable.value).toBe(31_730_846 * 2);
  });

  it("개인 시나리오에는 가족 급여를 반영하지 않는다", () => {
    const a = runIndividual(sc4, DEFAULT_ASSUMPTIONS);
    const b = runIndividual({ ...sc4, familyWorkers: 2 }, DEFAULT_ASSUMPTIONS);
    expect(b.ownerDisposable.value).toBe(a.ownerDisposable.value);
    expect(b.familyBurden.value).toBe(0);
  });
});

describe("R4 가족 고용·산재보험 (별거 시)", () => {
  it("별거 가족 1인 3,600만: 고용보험 본인 324,000 / 사업주 고용·산재 723,600", () => {
    const f = familyWorkerCost(36_000_000, true);
    expect(f.employeeInsurance).toBe(3_174_264 + 324_000);
    expect(f.employerInsurance).toBe(3_174_264 + 723_600);
    expect(f.corpCost).toBe(39_897_864);
    expect(f.burden).toBe(4_593_154);
    expect(f.disposable).toBe(31_406_846);
    expect(f.basis.some((b) => b.kind === "assumption")).toBe(true);
  });
  it("동거(기본)는 종전과 동일 — 고용보험 미반영", () => {
    const f = familyWorkerCost(36_000_000);
    expect(f.employeeInsurance).toBe(3_174_264);
    expect(f.corpCost).toBe(39_174_264);
  });
  it("법인 시나리오: 별거 플래그가 법인 비용을 723,600 늘린다", () => {
    const together = runCorporate({ ...sc4, familyWorkers: 1 }, DEFAULT_ASSUMPTIONS);
    const apart = runCorporate({ ...sc4, familyWorkers: 1, familyLivesSeparately: true }, DEFAULT_ASSUMPTIONS);
    expect(together.familyDisposable.value - apart.familyDisposable.value).toBe(324_000);
  });
});

describe("연 배당액 입력", () => {
  it("SC4 8천만: 배당 11,156,609이면 기존 손계산과 같다", () => {
    const r = runCorporate(sc4, DEFAULT_ASSUMPTIONS);
    expect(r.ownerDisposable.value).toBe(50_491_747);
    expect(r.corpRetained.value).toBe(11_156_609);
  });
  it("배당액이 세후 현금을 넘으면 현금까지로 자른다", () => {
    const r = runCorporate({ ...sc4, dividendAmount: 999_999_999 }, DEFAULT_ASSUMPTIONS);
    expect(r.corpRetained.value).toBe(0);
    expect(r.ownerDisposable.value).toBe(runCorporate({ ...sc4, dividendAmount: 22_313_218 }, DEFAULT_ASSUMPTIONS).ownerDisposable.value);
  });
  it("2천만 초과 배당은 그로스업·비교과세 경로 (§62) — steps에 방식1/방식2", () => {
    const r = runCorporate({ ...sc4, accountingProfit: 300_000_000, dividendAmount: 30_000_000 }, DEFAULT_ASSUMPTIONS);
    expect(r.ownerDisposable.steps.join(" ")).toContain("배당 30,000,000");
    expect(r.ownerDisposable.value).toBeGreaterThan(0);
  });
});

describe("가족 실수령 포함 토글 (Josh 2026-09-26) — hand-calc FAM-b", () => {
  it("법인: 포함 합산 = 기본 합산 + 가족 실수령 31,646,246. steps에 사용자 선택 표기", () => {
    const fam = runCorporate({ ...sc4, familyWorkers: 1 }, DEFAULT_ASSUMPTIONS);
    expect(fam.combinedNetWorthWithFamily.value).toBe(fam.combinedNetWorth.value + 31_730_846);
    expect(fam.combinedNetWorthWithFamily.steps).toContain("가족 실수령 포함(사용자 선택)");
    // 기본 합산은 그대로
    expect(fam.combinedNetWorth.value).toBe(fam.ownerDisposable.value + fam.corpRetained.value);
  });
  it("가족 0명·개인 시나리오는 두 합산이 같다", () => {
    const c = runCorporate(sc4, DEFAULT_ASSUMPTIONS);
    expect(c.combinedNetWorthWithFamily.value).toBe(c.combinedNetWorth.value);
    const i = runIndividual({ ...sc4, familyWorkers: 2 }, DEFAULT_ASSUMPTIONS);
    expect(i.combinedNetWorthWithFamily.value).toBe(i.combinedNetWorth.value);
  });
  it("최적 급여 탐색: 축 키에 따라 결과 값이 달라진다 (포함 축 > 미포함 축)", () => {
    const input = { ...sc4, familyWorkers: 1 };
    const base = findOptimalSalary(input, DEFAULT_ASSUMPTIONS, "combinedNetWorth");
    const withFam = findOptimalSalary(input, DEFAULT_ASSUMPTIONS, "combinedNetWorthWithFamily");
    expect(withFam.value).toBe(
      searchValue(runCorporate({ ...input, ownerSalary: withFam.salary }, DEFAULT_ASSUMPTIONS), "combinedNetWorthWithFamily"),
    );
    expect(withFam.value).toBeGreaterThan(base.value);
  });
  it("회수 기간·해설 문장도 플래그를 따른다", () => {
    const input = { ...sc4, familyWorkers: 1 };
    const p0 = conversionPayback(input, DEFAULT_ASSUMPTIONS, false);
    const p1 = conversionPayback(input, DEFAULT_ASSUMPTIONS, true);
    expect(p1.annualGain.value - p0.annualGain.value).toBe(31_730_846);
    const s = explainCompare(runIndividual(input, DEFAULT_ASSUMPTIONS), runCorporate(input, DEFAULT_ASSUMPTIONS), true);
    expect(s[1]).toContain("가족 실수령 포함");
  });
});
