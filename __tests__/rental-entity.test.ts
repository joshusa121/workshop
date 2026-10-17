import { describe, expect, it } from "vitest";
import { computeRental, dividendBreakpoint } from "@/lib/tax/rental-entity/engine";
import { DEFAULT_INPUT, validateInput, type RentalInput } from "@/lib/tax/rental-entity/input";
import { decodeRental, encodeRental } from "@/lib/tax/rental-entity/share";

const fixtures: [string, Partial<RentalInput>, number, number, number, number, string][] = [
  ["수입 없음", { revenue: 0, expenses: 0 }, 0, 0, 0, 0, "종합과세"],
  ["주택 수입 경계 포함", { revenue: 20_000_000 }, 1_120_000, 112_000, 4_000_000, 6_802_400, "분리과세"],
  ["주택 수입 경계 초과", { revenue: 20_000_001 }, 1_515_000, 151_500, 4_000_000, 6_802_400, "종합과세"],
  ["등록 요건 충족 주택", { revenue: 20_000_000, registered: true }, 560_000, 56_000, 4_000_000, 6_802_400, "분리과세"],
  ["실제 경비가 크면 종합 선택", { revenue: 20_000_000, expenses: 15_000_000, smallCorp: false }, 210_000, 21_000, 500_000, 1_235_300, "종합과세"],
  ["개인 과표 첫 구간 끝", { revenue: 15_500_000, kind: "commercial", smallCorp: false, dividendPercent: 0 }, 840_000, 84_000, 1_550_000, 1_705_000, "종합과세"],
  ["개인 과표 첫 구간 다음 원", { revenue: 15_500_001, kind: "commercial", smallCorp: false, dividendPercent: 0 }, 840_000, 84_000, 1_550_000, 1_705_000, "종합과세"],
  ["소규모 임대법인과 부분 배당", { revenue: 100_000_000, expenses: 20_000_000, kind: "commercial", dividendPercent: 10 }, 13_080_000, 1_308_000, 16_000_000, 18_560_960, "종합과세"],
  ["기존 다른 소득세를 빼고 비교", { revenue: 100_000_000, expenses: 20_000_000, otherIncome: 30_000_000, kind: "commercial", dividendPercent: 10 }, 19_520_000, 1_952_000, 16_000_000, 18_560_960, "종합과세"],
  ["분리과세 추가 공제 탈락", { revenue: 20_000_000, otherIncome: 20_000_001 }, 1_400_000, 140_000, 4_000_000, 6_802_400, "분리과세"],
  ["일반 법인 첫 구간 끝", { revenue: 200_000_000, kind: "commercial", smallCorp: false, dividendPercent: 0 }, 55_490_000, 5_549_000, 20_000_000, 22_000_000, "종합과세"],
  ["일반 법인 첫 구간 다음 원", { revenue: 200_000_001, kind: "commercial", smallCorp: false, dividendPercent: 0 }, 55_490_000, 5_549_000, 20_000_000, 22_000_000, "종합과세"],
];
describe("임대 개인·법인 독립 손계산 fixture", () => {
  it.each(fixtures)("%s", (_, patch, national, local, corp, total, mode) => {
    const r = computeRental({ ...DEFAULT_INPUT, ...patch });
    expect([r.personalNational.value, r.personalLocal.value, r.corpNational.value, r.corporateTotal.value, r.personalMode]).toEqual([national, local, corp, total, mode]);
    expect(r.profit.value).toBe(r.retained.value + r.dividend.value + r.corpNational.value + r.corpLocal.value);
  });
  it("적자에 다른 소득의 세금 환급을 임의 적용하지 않는다", () => {
    const r = computeRental({ ...DEFAULT_INPUT, revenue: 1_000_000, expenses: 2_000_000, otherIncome: 50_000_000 });
    expect(r.personalTotal.value).toBe(0);
    expect(r.corporateTotal.value).toBe(0);
  });
  it("금융소득 합계 경계에서는 비교하고 초과하면 최종 판정을 막는다", () => {
    const input = { ...DEFAULT_INPUT, revenue: 20_000_000, kind: "commercial" as const, smallCorp: false };
    const dividend = computeRental(input).dividend.value;
    expect(computeRental({ ...input, otherFinancial: 20_000_000 - dividend }).comparable).toBe(true);
    expect(computeRental({ ...input, otherFinancial: 20_000_001 - dividend }).comparable).toBe(false);
  });
  it("배당 분기점은 절사한 실제 세액을 기준으로 경계를 찾는다", () => {
    const r = computeRental({ ...DEFAULT_INPUT, revenue: 60_000_000, kind: "commercial", smallCorp: false, dividendPercent: 0 });
    const point = dividendBreakpoint(r, 0);
    expect(point.status).toBe("crossing");
    if (point.status === "crossing") {
      expect(point.amount.value).toBe(16_285_715);
    }
  });
  it("미검증 금융소득 영역으로 분기점을 외삽하지 않는다", () => {
    const r = computeRental({ ...DEFAULT_INPUT, revenue: 200_000_000, kind: "commercial", smallCorp: false, dividendPercent: 0 });
    expect(dividendBreakpoint(r, 0).status).toBe("outside");
  });
});
describe("입력·공유 링크", () => {
  it("전체 입력을 왕복 보존한다", () => expect(decodeRental(encodeRental(DEFAULT_INPUT))).toEqual({ ok: true, input: DEFAULT_INPUT, ratesChanged: false }));
  it.each([NaN, Infinity, -1, 0.5, 1e13])("잘못된 금액 %s를 차단한다", revenue => expect(validateInput({ ...DEFAULT_INPUT, revenue }).length).toBeGreaterThan(0));
  it("배당 비율과 등록 주택 선택을 검증한다", () => {
    expect(validateInput({ ...DEFAULT_INPUT, dividendPercent: 101 })).not.toEqual([]);
    expect(validateInput({ ...DEFAULT_INPUT, kind: "commercial", registered: true })).not.toEqual([]);
  });
  it.each(["broken", btoa("null"), btoa(JSON.stringify({ v: 1, d: {} }))])("손상 링크 %s를 거부한다", s => expect(decodeRental(s).ok).toBe(false));
  it("구형 세율 링크는 경고와 함께 복원한다", () => {
    const s = btoa(JSON.stringify({ v: 1, r: "old", d: DEFAULT_INPUT }));
    expect(decodeRental(s)).toEqual({ ok: true, input: DEFAULT_INPUT, ratesChanged: true });
  });
  it("링크의 알 수 없는 필드를 버려 불필요한 값을 재공유하지 않는다", () => {
    const s = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, r: "old", d: { ...DEFAULT_INPUT, note: "임의 메모" } }))));
    const d = decodeRental(s);
    expect(d.ok).toBe(true);
    if (d.ok) expect(Object.keys(d.input).sort()).toEqual(Object.keys(DEFAULT_INPUT).sort());
  });
  it("구형 스키마는 거부한다", () => expect(decodeRental(btoa(JSON.stringify({ v: 0, d: DEFAULT_INPUT }))).ok).toBe(false));
});
