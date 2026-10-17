import { describe, expect, it } from "vitest";
import { addMonths, addYears, describeSpan, endOfMonth, fullMonths, fullYears, isValidDate, withinMonthsLastDay, withinYearsLastDay } from "../src/lib/tax/cgt/period";

describe("기간 계산 (초일산입 — 응당일 전날에 n년 충족)", () => {
  it("홈택스 대조: 2023-09-02 → 2026-09-01 = 3년, 2023-09-03 → 2년", () => {
    expect(fullYears("2023-09-02", "2026-09-01")).toBe(3);
    expect(fullYears("2023-09-03", "2026-09-01")).toBe(2);
    expect(fullYears("2016-03-02", "2026-03-01")).toBe(10);
    expect(fullYears("2016-03-03", "2026-03-01")).toBe(9);
  });
  it("n년 이내 마지막 날", () => {
    expect(withinYearsLastDay("2023-06-01", 3)).toBe("2026-05-31");
    expect(withinMonthsLastDay("2026-05-01", 4)).toBe("2026-08-31");
  });
  it("1년 미만·역순은 0", () => {
    expect(fullYears("2026-01-10", "2026-09-01")).toBe(0);
    expect(fullYears("2026-09-01", "2026-01-10")).toBe(0);
  });
  it("윤년 2월 29일 취득", () => {
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(fullYears("2024-02-29", "2026-02-27")).toBe(2);
    expect(fullYears("2024-02-29", "2026-02-26")).toBe(1);
  });
  it("개월 수·표기", () => {
    expect(fullMonths("2020-01-15", "2026-09-01")).toBe(79);
    expect(fullMonths("2020-01-15", "2020-02-14")).toBe(1);
    expect(describeSpan("2020-01-15", "2026-09-01")).toBe("6년 7개월");
    expect(describeSpan("2026-01-10", "2026-09-01")).toBe("7개월");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
  it("말일·유효성", () => {
    expect(endOfMonth("2026-09-01")).toBe("2026-09-30");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("")).toBe(false);
  });
});
