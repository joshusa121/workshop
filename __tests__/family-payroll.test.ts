import { describe, expect, it } from "vitest";
import { computeFamilyPayroll } from "@/lib/tax/family-payroll/engine";
import { DEFAULT_FAMILY_INPUT, SAMPLE_FAMILY_INPUT, familyInputErrors, type FamilyPayrollInput } from "@/lib/tax/family-payroll/input";
import { decodeFamilyPayroll, encodeFamilyPayroll } from "@/lib/tax/family-payroll/share";
import { FAMILY_PAYROLL_VERSION } from "@/lib/tax/family-payroll/version";

const input = (patch: Partial<FamilyPayrollInput> = {}): FamilyPayrollInput => ({
  ...DEFAULT_FAMILY_INPUT, actualWork: "yes", reasonablePay: "yes", evidence: "yes",
  insuranceConfirmed: true, onlySalary: true, ...patch,
});

// docs/verified/family-payroll-hand-calc-fixtures.md: 엔진을 사용하지 않은 Decimal 속산식 결과.
const fixtures = [
  { name: "급여 없음", patch: { businessTaxBase: 50_000_000 }, after: 50_000_000, deduction: 0, biz: 0, local: 0, wage: 0, wageLocal: 0, net: 0, method: "standard" },
  { name: "보험과 표준공제 비교", patch: { businessTaxBase: 50_000_000, salary: 24_000_000, employerPremium: 2_400_000, workerPension: 1_140_000, workerOtherPremium: 1_000_000 }, after: 23_600_000, deduction: 8_850_000, biz: 3_960_000, local: 396_000, wage: 207_770, wageLocal: 20_777, net: -412_547, method: "standard" },
  { name: "기존 부양공제 상실", patch: { businessTaxBase: 50_000_000, salary: 24_000_000, employerPremium: 2_400_000, workerPension: 1_140_000, workerOtherPremium: 1_000_000, wasDependent: true }, after: 25_100_000, deduction: 8_850_000, biz: 3_735_000, local: 373_500, wage: 207_770, wageLocal: 20_777, net: -660_047, method: "standard" },
  { name: "과표 경계 직전", patch: { businessTaxBase: 13_999_999, salary: 1 }, after: 13_999_998, deduction: 0, biz: 0, local: 0, wage: 0, wageLocal: 0, net: 0, method: "standard" },
  { name: "과표 경계 직후", patch: { businessTaxBase: 14_000_001, salary: 1 }, after: 14_000_000, deduction: 0, biz: 0, local: 0, wage: 0, wageLocal: 0, net: 0, method: "standard" },
  { name: "총급여 500만원 정확히", patch: { businessTaxBase: 50_000_000, salary: 5_000_000, wasDependent: true }, after: 45_000_000, deduction: 3_500_000, biz: 750_000, local: 75_000, wage: 0, wageLocal: 0, net: 825_000, method: "standard" },
  { name: "총급여 500만원 1원 초과", patch: { businessTaxBase: 50_000_000, salary: 5_000_001, wasDependent: true }, after: 46_499_999, deduction: 3_500_000, biz: 525_001, local: 52_501, wage: 0, wageLocal: 0, net: 577_502, method: "standard" },
  { name: "과표 0에서 보험 부담", patch: { salary: 24_000_000, employerPremium: 2_400_000, workerPension: 1_140_000, workerOtherPremium: 1_000_000 }, after: 0, deduction: 8_850_000, biz: 0, local: 0, wage: 207_770, wageLocal: 20_777, net: -4_768_547, method: "standard" },
  { name: "특별소득공제가 유리", patch: { businessTaxBase: 150_000_000, salary: 45_000_000, employerPremium: 4_500_000, workerPension: 2_137_500, workerOtherPremium: 2_000_000 }, after: 100_500_000, deduction: 12_000_000, biz: 17_325_000, local: 1_732_500, wage: 2_184_375, wageLocal: 218_437, net: 8_017_188, method: "insurance" },
  { name: "보험 증가액 없음", patch: { businessTaxBase: 50_000_000, salary: 24_000_000 }, after: 26_000_000, deduction: 8_850_000, biz: 3_600_000, local: 360_000, wage: 238_550, wageLocal: 23_855, net: 3_697_595, method: "standard" },
] satisfies { name: string; patch: Partial<FamilyPayrollInput>; after: number; deduction: number; biz: number; local: number; wage: number; wageLocal: number; net: number; method: string }[];

describe("가족 고용 독립 손계산 fixture", () => {
  it.each(fixtures)("$name", f => {
    const r = computeFamilyPayroll(input(f.patch));
    expect(r.baseAfter.value).toBe(f.after);
    expect(r.salaryDeduction.value).toBe(f.deduction);
    expect(r.businessTaxSaving?.value).toBe(f.biz);
    expect(r.localTaxSaving?.value).toBe(f.local);
    expect(r.wageTax.value).toBe(f.wage);
    expect(r.wageLocalTax.value).toBe(f.wageLocal);
    expect(r.netSaving?.value).toBe(f.net);
    expect(r.deductionMethod).toBe(f.method);
  });
  it.each(["actualWork", "reasonablePay", "evidence"] as const)("%s 불확정이면 절약액을 확정하지 않는다", key => {
    for (const value of ["unknown", "no"] as const) {
      const r = computeFamilyPayroll(input({ ...SAMPLE_FAMILY_INPUT, [key]: value }));
      expect(r.netSaving).toBeNull(); expect(r.businessTaxSaving).toBeNull();
      expect(r.reviewReasons.join()).toContain("Josh 감수");
    }
  });
  it("보험 적용 미확인과 다른 소득은 결과를 보류한다", () => {
    expect(computeFamilyPayroll(input({ insuranceConfirmed: false })).netSaving).toBeNull();
    expect(computeFamilyPayroll(input({ onlySalary: false })).netSaving).toBeNull();
  });
  it("동거·관계만으로 보험료를 0원 처리하지 않는다", () => {
    const r = computeFamilyPayroll(input({ ...SAMPLE_FAMILY_INPUT, livingTogether: true, relation: "spouse" }));
    expect(r.insuranceCost.value).toBe(8_637_500);
    expect(r.netSaving?.value).toBe(8_017_188);
  });
  it.each([SAMPLE_FAMILY_INPUT, DEFAULT_FAMILY_INPUT])("모든 계산값에 과정·근거와 사람용 링크가 있다", value => {
    const r = computeFamilyPayroll(value);
    for (const t of Object.values(r)) {
      if (t && typeof t === "object" && "value" in t && "basis" in t) {
        expect(t.steps.length).toBeGreaterThan(0); expect(t.basis.length).toBeGreaterThan(0);
        for (const b of t.basis) if (b.kind === "law") { expect(b.url).toMatch(/^https:\/\/www.law.go.kr\/법령\//); expect(b.url).not.toContain("OC="); }
      }
    }
  });
});

describe("입력과 공유 링크", () => {
  it.each([NaN, Infinity, -1, 0.5, 1e13, "100", null])("잘못된 금액 %s 거부", salary => {
    const raw = { ...input(), salary };
    expect(familyInputErrors(raw).length).toBeGreaterThan(0);
    expect(() => computeFamilyPayroll(raw as FamilyPayrollInput)).toThrow();
  });
  it("급여보다 큰 근로자 보험료 거부", () => expect(familyInputErrors(input({ salary: 100, workerPension: 60, workerOtherPremium: 50 })).length).toBeGreaterThan(0));
  it("숫자와 체크 여부가 누락된 링크 거부", () => expect(decodeFamilyPayroll(btoa(JSON.stringify({ v: 1, r: FAMILY_PAYROLL_VERSION, d: {} }))).ok).toBe(false));
  it("공유 왕복", () => expect(decodeFamilyPayroll(encodeFamilyPayroll(SAMPLE_FAMILY_INPUT))).toEqual({ ok: true, input: SAMPLE_FAMILY_INPUT, ratesChanged: false }));
  it.each(["", "!", btoa("{}"), "a".repeat(12001)])("손상 링크 거부", s => expect(decodeFamilyPayroll(s).ok).toBe(false));
  it("스키마 만료", () => expect(decodeFamilyPayroll(btoa(JSON.stringify({ v: 99 })))).toEqual({ ok: false, reason: "만료된 형식" }));
  it("세율 버전 변경 경고", () => expect(decodeFamilyPayroll(btoa(JSON.stringify({ v: 1, r: "old", d: SAMPLE_FAMILY_INPUT })))).toMatchObject({ ok: true, ratesChanged: true }));
});
