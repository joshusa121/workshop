import { describe, expect, it } from "vitest";
import { computeAuditRisk } from "@/lib/tax/audit-risk/engine";
import { auditRiskInputErrors, type AuditRiskInput } from "@/lib/tax/audit-risk/input";
import { decodeAuditRisk, encodeAuditRisk } from "@/lib/tax/audit-risk/share";
import { AUDIT_RISK_RATES_VERSION } from "@/lib/tax/audit-risk/version";
import { LAW_BASES } from "@/lib/tax/audit-risk/rates";

// docs/verified/audit-risk-hand-calc-fixtures.md에서 독립 손계산한 상수만 사용한다.
const base: AuditRiskInput = {
  entity: "corporation", annualRevenue: 100_000_000, totalExpenses: 40_000_000,
  cashRevenuePercent: 0, suspectedFakeExpensePercent: 0, ownerAdvance: 0,
  entertainmentExcess: 0, undocumentedPurchases: 0, compliance: "met",
};
const fixtures: { name: string; over: Partial<AuditRiskInput>; cash: number; fake: number; flagged: number; urgent: number; level: string }[] = [
  { name: "F1 모두 없음", over: {}, cash: 0, fake: 0, flagged: 0, urgent: 0, level: "no-signals" },
  { name: "F2 현금 100%도 우선검토 단정 금지", over: { cashRevenuePercent: 100 }, cash: 100_000_000, fake: 0, flagged: 1, urgent: 0, level: "review" },
  { name: "F3 가공 의심 비중 최소 입력 0.01%", over: { suspectedFakeExpensePercent: 0.01 }, cash: 0, fake: 4_000, flagged: 1, urgent: 1, level: "priority" },
  { name: "F4 무자료 매입 1원 경계", over: { undocumentedPurchases: 1 }, cash: 0, fake: 0, flagged: 1, urgent: 1, level: "priority" },
  { name: "F5 가지급금과 한도초과의 자료 점검", over: { ownerAdvance: 1, entertainmentExcess: 1 }, cash: 0, fake: 0, flagged: 2, urgent: 0, level: "review" },
  { name: "F6 모든 징후와 의무 미이행", over: { cashRevenuePercent: 37.5, suspectedFakeExpensePercent: 12.5, ownerAdvance: 10_000_000, entertainmentExcess: 2_000_000, undocumentedPurchases: 3_000_000, compliance: "unmet" }, cash: 37_500_000, fake: 5_000_000, flagged: 6, urgent: 3, level: "priority" },
  { name: "F7 원 미만 절사도 의심 비중은 남음", over: { annualRevenue: 1, totalExpenses: 1, cashRevenuePercent: 0.01, suspectedFakeExpensePercent: 0.01 }, cash: 0, fake: 0, flagged: 2, urgent: 1, level: "priority" },
  { name: "F8 개인은 가지급금 제외", over: { entity: "individual", annualRevenue: 250_000_001, totalExpenses: 80_000_001, cashRevenuePercent: 12.34, suspectedFakeExpensePercent: 1.23, entertainmentExcess: 500_000, undocumentedPurchases: 900_000 }, cash: 30_850_000, fake: 984_000, flagged: 4, urgent: 2, level: "priority" },
  { name: "F9 미확인 의무는 안전 판정 금지", over: { compliance: "unknown" }, cash: 0, fake: 0, flagged: 0, urgent: 0, level: "incomplete" },
];

describe("세무조사 리스크 — 독립 손계산 fixture", () => {
  it.each(fixtures)("$name", f => {
    const r = computeAuditRisk({ ...base, ...f.over });
    expect(r.cashRevenue.value).toBe(f.cash);
    expect(r.suspectedFakeExpenses.value).toBe(f.fake);
    expect(r.flaggedCount.value).toBe(f.flagged);
    expect(r.priorityCount.value).toBe(f.urgent);
    expect(r.level).toBe(f.level);
    expect(r.expertReview).toBe(true);
  });
});

describe("입력 경계와 잘못된 값", () => {
  it.each([
    { annualRevenue: -1 }, { totalExpenses: Infinity }, { ownerAdvance: 0.5 },
    { cashRevenuePercent: 100.01 }, { suspectedFakeExpensePercent: 0.001 },
    { annualRevenue: 0, cashRevenuePercent: 1 }, { totalExpenses: 0, suspectedFakeExpensePercent: 1 },
    { undocumentedPurchases: 40_000_001 }, { entertainmentExcess: 40_000_001 },
    { entity: "individual", ownerAdvance: 1 }, { compliance: "anything" },
    { annualRevenue: "100000000" }, { cashRevenuePercent: NaN },
  ])("잘못된 입력 %j는 계산 거부", over => {
    const invalid = { ...base, ...over };
    expect(auditRiskInputErrors(invalid).length).toBeGreaterThan(0);
    expect(() => computeAuditRisk(invalid as AuditRiskInput)).toThrow();
  });
  it("필수값 누락을 0으로 채우지 않음", () => {
    expect(auditRiskInputErrors({}).length).toBeGreaterThan(0);
    expect(auditRiskInputErrors(null).length).toBeGreaterThan(0);
  });
  it("매출보다 큰 경비와 서로 겹치는 지표 허용", () => {
    expect(auditRiskInputErrors({ ...base, totalExpenses: 200_000_000, entertainmentExcess: 150_000_000, undocumentedPurchases: 150_000_000 })).toEqual([]);
  });
});

function payload(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
describe("공유 링크", () => {
  it("개인·법인 값 왕복 복원", () => {
    for (const entity of ["individual", "corporation"] as const) {
      const input = { ...base, entity, cashRevenuePercent: 12.34 };
      expect(decodeAuditRisk(encodeAuditRisk(input))).toEqual({ ok: true, input, ratesChanged: false });
    }
  });
  it.each(["", "%%%", payload(null), payload({ v: 1, r: AUDIT_RISK_RATES_VERSION, d: {} }), payload({ v: 1, r: AUDIT_RISK_RATES_VERSION, d: { ...base, cashRevenuePercent: "20" } })])("손상된 값 거부 %s", s => {
    expect(decodeAuditRisk(s).ok).toBe(false);
  });
  it("이전 형식과 기준 변경 구분", () => {
    expect(decodeAuditRisk(payload({ v: 0, r: AUDIT_RISK_RATES_VERSION, d: base }))).toEqual({ ok: false, reason: "만료된 형식" });
    expect(decodeAuditRisk(payload({ v: 1, r: "old", d: base }))).toEqual({ ok: true, input: base, ratesChanged: true });
  });
  it("기준 버전 누락 거부", () => {
    expect(decodeAuditRisk(payload({ v: 1, d: base })).ok).toBe(false);
  });
});

describe("숫자 근거·법령 메타데이터", () => {
  it("모든 산출 숫자에 Traced 근거", () => {
    const r = computeAuditRisk({ ...base, ...fixtures[5].over });
    for (const t of [r.annualRevenue, r.totalExpenses, r.cashPercent, r.fakePercent, r.cashRevenue, r.suspectedFakeExpenses, r.ownerAdvance, r.entertainmentExcess, r.undocumentedPurchases, r.flaggedCount, r.priorityCount, r.unknownCount, r.applicableCount]) {
      expect(t.steps.length).toBeGreaterThan(0);
      expect(t.basis.length).toBeGreaterThan(0);
    }
  });
  it("사람용 법령 링크·시행일·확인일", () => {
    for (const b of Object.values(LAW_BASES)) {
      expect(b.kind).toBe("law");
      if (b.kind !== "law") continue;
      expect(b.url).toMatch(/^https:\/\/www.law.go.kr\/법령\//);
      expect(b.url).not.toContain("OC=");
      expect(b.effectiveFrom).toMatch(/^2026-/);
      expect(b.confirmedAt).toBe("2026-10-17");
    }
  });
});
