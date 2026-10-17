import { describe, expect, it } from "vitest";
import { employeeInsurance, regionalHealthParts, regionalInsurance } from "../src/lib/tax/insurance";

describe("employeeInsurance 상하한", () => {
  it("S3-low 하한 미만 → 하한 적용", () => {
    const r = employeeInsurance(2_400_000);
    expect(r.npsEmployee.value).toBe(230_850);
    expect(r.npsEmployer.value).toBe(230_850);
  });

  it("S3-mid 중간", () => {
    const r = employeeInsurance(48_000_000);
    expect(r.npsEmployee.value).toBe(2_280_000);
    expect(r.nhisEmployee.value).toBe(1_725_600);
    expect(r.ltcEmployee.value).toBe(226_752);
    expect(r.employee.value).toBe(2_280_000 + 1_725_600 + 226_752);
    expect(r.employer.value).toBe(r.employee.value);
  });

  it("S3-cap 상한 초과", () => {
    expect(employeeInsurance(120_000_000).npsEmployee.value).toBe(3_693_600);
  });

  it("S3-exact 상반 상한과 동일", () => {
    expect(employeeInsurance(76_440_000).npsEmployee.value).toBe(3_630_900);
  });
});

describe("regionalInsurance", () => {
  it("S3-reg 재산 미입력 — 소득분+연금, assumption 포함", () => {
    const r = regionalInsurance(48_000_000);
    expect(r.value).toBe(8_464_704);
    expect(r.basis.some((b) => b.kind === "assumption")).toBe(true);
    expect(r.steps.some((s) => s.includes("재산 미반영"))).toBe(true);
  });

  it("재산 금액을 넣어도 점수표 없으면 재산보험료 0", () => {
    const r = regionalInsurance(48_000_000, 200_000_000);
    expect(r.value).toBe(8_464_704);
    expect(r.steps.some((s) => s.includes("점수 환산표"))).toBe(true);
  });
});

describe("R2 지역 건강·장기요양 필요경비 (영 §55①11의3)", () => {
  it("소득 1.5억 → 건보 10,785,000 / 장기요양 1,417,200", () => {
    const h = regionalHealthParts(150_000_000);
    expect(h.nhis).toBe(10_785_000);
    expect(h.ltc).toBe(1_417_200);
    expect(h.nhis + h.ltc).toBe(12_202_200);
  });
});
