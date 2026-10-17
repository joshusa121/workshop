import { describe, expect, it } from "vitest";
import { computeCalendar } from "@/lib/tax/tax-calendar/engine";
import { DEFAULT_INPUT, parseInput } from "@/lib/tax/tax-calendar/input";
import { decodeCalendar, encodeCalendar } from "@/lib/tax/tax-calendar/share";
import { CALENDAR_VERSION } from "@/lib/tax/tax-calendar/version";

// 조문만 읽고 독립 계산한 고정값. 엔진의 날짜 함수로 기대값을 만들지 않는다.
const dates = (patch: Partial<typeof DEFAULT_INPUT> = {}) => computeCalendar({ ...DEFAULT_INPUT, ...patch }).events.map(e => `${e.id}:${e.date}`);

describe("절세 캘린더 — 독립 손계산 fixture", () => {
  it("개인 일반: 전년 하반기 확정·예정고지·당년 상반기 확정·종소세", () => {
    expect(dates()).toEqual([
      "vat-final-prev:2026-01-25", "vat-advance-first:2026-04-25", "income-final:2026-05-31",
      "vat-final-first:2026-07-25", "vat-advance-second:2026-10-25",
    ]);
  });
  it("개인 성실신고 제출: 오월 신고를 유월 말로 대체", () => {
    expect(dates({ vat: "exempt", sincere: true })).toEqual(["income-final:2026-06-30"]);
  });
  it("간이: 전년 연간 확정과 조건부 칠월 일정만 표시", () => {
    expect(dates({ vat: "simplified" })).toEqual([
      "vat-simple-final:2026-01-25", "income-final:2026-05-31", "vat-simple-july:2026-07-25",
    ]);
  });
  it("면세 법인·십이월 결산: 전년 말 + 석 달 = 삼월 말", () => {
    expect(dates({ entity: "corporation", vat: "exempt" })).toEqual(["corp-final:2026-03-31"]);
  });
  it("법인 성실신고 제출: 전년 말 + 넉 달 = 사월 말", () => {
    expect(dates({ entity: "corporation", vat: "exempt", sincere: true })).toEqual(["corp-final:2026-04-30"]);
  });
  it("반기 원천세: 전년 하반기·당년 상반기, 십이월에서 일월로 이월", () => {
    expect(dates({ entity: "corporation", vat: "exempt", withholding: "semiannual" })).toEqual([
      "withholding-prev:2026-01-10", "corp-final:2026-03-31", "withholding-first:2026-07-10",
    ]);
  });
  it("매월 원천세: 연간 열두 번, 첫 일정의 대상은 전년 십이월", () => {
    const r = computeCalendar({ ...DEFAULT_INPUT, withholding: "monthly" });
    const w = r.events.filter(e => e.id.startsWith("withholding-"));
    expect(w.map(e => e.date)).toEqual(["2026-01-10","2026-02-10","2026-03-10","2026-04-10","2026-05-10","2026-06-10","2026-07-10","2026-08-10","2026-09-10","2026-10-10","2026-11-10","2026-12-10"]);
    expect(w[0].period).toBe("2025년 12월 징수분");
  });
  it("주택·토지·건물 및 종부세: 납기 시작일과 말일을 보존", () => {
    const r = computeCalendar({ ...DEFAULT_INPUT, entity: "corporation", vat: "exempt", house: true, land: true, building: true, comprehensiveProperty: true });
    expect(r.events.filter(e => e.id.startsWith("property-") || e.id === "comprehensive-property").map(e => [e.id,e.startsOn,e.date])).toEqual([
      ["property-building","2026-07-16","2026-07-31"], ["property-house-first","2026-07-16","2026-07-31"],
      ["property-house-second","2026-09-16","2026-09-30"], ["property-land","2026-09-16","2026-09-30"],
      ["comprehensive-property","2026-12-01","2026-12-15"],
    ]);
  });
  it("연말정산은 이월분 급여 지급 시: 이월 말일을 법정기한으로 만들지 않음", () => {
    const e = computeCalendar({ ...DEFAULT_INPUT, payroll: true }).events.find(e => e.id === "payroll-settlement")!;
    expect(e.date).toBeNull();
    expect(e.month).toBe(2);
    expect(e.timing).toBe("2월분 급여 지급 시");
  });
  it("십일월 결산: 석 달 후 이월은 이십팔일까지 — 일수 경계", () => {
    expect(dates({ entity: "corporation", vat: "exempt", fiscalEndMonth: 11 })).toEqual(["corp-final:2026-02-28"]);
  });
  it("구월·시월 결산 경계: 당년 십이월과 다음 연도 일월의 사업연도 선택", () => {
    expect(dates({ entity: "corporation", vat: "exempt", fiscalEndMonth: 9 })).toEqual(["corp-final:2026-12-31"]);
    const r = computeCalendar({ ...DEFAULT_INPUT, entity: "corporation", vat: "exempt", fiscalEndMonth: 10 });
    expect(r.events[0].date).toBe("2026-01-31");
    expect(r.events[0].period).toBe("2025년 10월 결산 사업연도");
  });
  it("일요일인 명목일은 그대로 보존하며 휴일 이연 미반영을 알림", () => {
    const r = computeCalendar(DEFAULT_INPUT);
    expect(r.events.find(e => e.id === "income-final")?.date).toBe("2026-05-31");
    expect(r.notes.join(" ")).toContain("휴일");
  });
});

describe("입력·공유·근거 무결성", () => {
  it("직접 호출도 잘못된 연도·결산월·간이법인·타입을 거절", () => {
    for (const patch of [{ year: 2027 }, { fiscalEndMonth: 0 }, { fiscalEndMonth: 13 }, { fiscalEndMonth: 1.5 }, { entity: "corporation", vat: "simplified" }, { house: "true" }, { withholding: "other" }, { entity: ["individual"] }, { vat: ["general"] }, { withholding: ["monthly"] }]) {
      expect(parseInput({ ...DEFAULT_INPUT, ...patch })).toBeNull();
      expect(() => computeCalendar({ ...DEFAULT_INPUT, ...patch } as typeof DEFAULT_INPUT)).toThrow();
    }
  });
  it("링크 왕복 시 모든 선택 보존", () => {
    const input = { ...DEFAULT_INPUT, sincere: true, house: true, withholding: "semiannual" as const };
    expect(decodeCalendar(encodeCalendar(input))).toEqual({ ok: true, input, ratesChanged: false });
  });
  it("손상·누락·과대 링크·스키마 만료를 안전하게 거절", () => {
    for (const s of ["?", "a".repeat(12001), btoa(JSON.stringify({ v: 1, d: {} })), btoa(JSON.stringify({ v: 9, d: DEFAULT_INPUT }))]) {
      expect(decodeCalendar(s).ok).toBe(false);
    }
  });
  it("이전 법령 버전은 입력을 복원하며 재계산 경고", () => {
    const s = btoa(JSON.stringify({ v: 1, r: "old", d: DEFAULT_INPUT }));
    expect(decodeCalendar(s)).toEqual({ ok: true, input: DEFAULT_INPUT, ratesChanged: true });
    expect(CALENDAR_VERSION).toBeTruthy();
  });
  it("날짜·건수 모두 추적 가능하고 근거 링크는 사람용", () => {
    const r = computeCalendar({ ...DEFAULT_INPUT, house: true, comprehensiveProperty: true, payroll: true, withholding: "semiannual" });
    expect(r.count.value).toBe(r.events.length);
    for (const t of [r.count, r.year, ...r.events.map(e => e.trace)]) {
      expect(t.steps.length).toBeGreaterThan(0);
      expect(t.basis.length).toBeGreaterThan(0);
      for (const b of t.basis) if (b.kind === "law") {
        expect(b.url).toMatch(/^https:\/\/www\.law\.go\.kr\/법령\//);
        expect(b.url).not.toMatch(/OC=|axtax/);
      }
    }
    expect(r.events.filter(e => e.conditional).length).toBeGreaterThan(0);
  });
});
