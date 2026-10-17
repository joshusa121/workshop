import { describe, expect, it } from "vitest";
import { computeCgt } from "../src/lib/tax/cgt/cgt";
import { EMPTY_CGT_INPUT, filingDeadline, isComplete, missingFields, SAMPLE_SURCHARGE, SAMPLE_TEMPORARY } from "../src/lib/tax/cgt/defaults";

describe("화면 보조", () => {
  it("예정신고 기한: 양도한 달 말일부터 2개월", () => {
    expect(filingDeadline("2026-09-01")).toBe("2026-11-30");
    expect(filingDeadline("2026-12-15")).toBe("2027-02-28");
    expect(filingDeadline("2026-10-31")).toBe("2026-12-31");
  });
  it("빈 입력은 미완성, 채울 항목을 알려준다", () => {
    expect(isComplete(EMPTY_CGT_INPUT)).toBe(false);
    expect(missingFields(EMPTY_CGT_INPUT)).toEqual(["산 날", "판 날", "판 값"]);
  });
  it("날짜 역순은 미완성", () => {
    const x = { ...SAMPLE_SURCHARGE, subject: { ...SAMPLE_SURCHARGE.subject, acquiredAt: "2027-01-01" } };
    expect(isComplete(x)).toBe(false);
    expect(missingFields(x)).toContain("판 날이 산 날보다 앞섭니다");
  });
  it("예시 1: 일시적 2주택 → 비과세 적용, 12억 초과분만 과세", () => {
    const r = computeCgt(SAMPLE_TEMPORARY);
    expect(isComplete(SAMPLE_TEMPORARY)).toBe(true);
    expect(r.status.category).toBe("temporary_two");
    expect(r.exemption.exempt).toBe(true);
    expect(r.exemption.fullyExempt).toBe(false);
    expect(r.surcharge.applies).toBe(false);
    expect(r.total.value).toBeGreaterThan(0);
  });
  it("예시 2: 조정지역 2주택 중과 = F5(a)", () => {
    const r = computeCgt(SAMPLE_SURCHARGE);
    expect(r.surcharge.applies).toBe(true);
    expect(r.total.value).toBe(233_816_000);
  });
});
