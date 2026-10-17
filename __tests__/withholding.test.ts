import { describe, expect, it } from "vitest";
import { computeWithholding, paymentDeadline } from "@/lib/tax/withholding/engine";
import { DEFAULT_WITHHOLDING, isWithholdingInput, type WithholdingInput } from "@/lib/tax/withholding/input";
import { decodeWithholding, encodeWithholding } from "@/lib/tax/withholding/share";

const input = (p: Partial<WithholdingInput> = {}): WithholdingInput => ({ ...DEFAULT_WITHHOLDING, ...p });

// 기대값은 docs/verified/withholding-hand-calc-fixtures.md에서 독립 손계산.
const fixtures: [string, Partial<WithholdingInput>, number, number, number, number][] = [
  ["인적용역 사업소득", { gross: 1_000_000 }, 1_000_000, 30_000, 3_000, 967_000],
  ["사업소득은 소액부징수 예외", { gross: 30_000 }, 30_000, 900, 90, 29_010],
  ["일시적 강연료", { kind: "other", gross: 1_000_000 }, 400_000, 80_000, 8_000, 912_000],
  ["기타소득금액 5만원 경계", { kind: "other", gross: 125_000 }, 50_000, 0, 0, 125_000],
  ["5만원 경계 초과 및 끝수", { kind: "other", gross: 125_001 }, 50_000, 10_000, 1_000, 114_001],
  ["경쟁대회 상금", { kind: "other", otherCategory: "prize", gross: 1_000_000 }, 200_000, 40_000, 4_000, 956_000],
  ["사례금 실제 경비", { kind: "other", otherCategory: "reward", gross: 1_000_000, actualExpenses: 100_000 }, 900_000, 180_000, 18_000, 802_000],
  ["일반 이자", { kind: "interest", gross: 1_000_000 }, 1_000_000, 140_000, 14_000, 846_000],
  ["이자는 소액부징수 예외", { kind: "interest", gross: 5_000 }, 5_000, 700, 70, 4_230],
  ["배당 소액부징수", { kind: "dividend", gross: 7_142 }, 7_142, 0, 0, 7_142],
  ["배당 소액부징수 경계 초과", { kind: "dividend", gross: 7_143 }, 7_143, 1_000, 100, 6_043],
  ["정률경비보다 큰 실제 경비", { kind: "other", gross: 1_000_000, actualExpenses: 700_000 }, 300_000, 60_000, 6_000, 934_000],
  ["실제 경비가 지급액과 같음", { kind: "other", gross: 1_000_000, actualExpenses: 1_000_000 }, 0, 0, 0, 1_000_000],
  ["0원", { gross: 0 }, 0, 0, 0, 0],
  ["십원 미만 절사", { gross: 33_333 }, 33_333, 990, 90, 32_253],
];

describe("원천세 독립 손계산 fixture", () => {
  it.each(fixtures)("%s", (_, patch, taxable, national, local, net) => {
    const r = computeWithholding(input(patch));
    expect([r.taxable.value, r.national.value, r.local.value, r.net.value]).toEqual([taxable, national, local, net]);
    expect(r.total.value + r.net.value).toBe(input(patch).gross);
    for (const t of [r.gross, r.expenses, r.taxable, r.national, r.local, r.total, r.net, r.nationalRate, r.expenseRate, r.localRate]) {
      expect(t.steps.length).toBeGreaterThan(0);
      expect(t.basis.length).toBeGreaterThan(0);
      for (const b of t.basis) if (b.kind === "law") {
        expect(b.url).toMatch(/^https:\/\/www\.law\.go\.kr\/법령\//);
        expect(b.url).not.toContain("OC=");
      }
    }
  });
  it("다른 소득에서는 기타소득 경비 입력을 적용하지 않는다", () => {
    expect(computeWithholding(input({ actualExpenses: 999_999 })).expenses.value).toBe(0);
  });
});

describe("납부 기준일", () => {
  it.each([
    ["2026-10-17", "monthly", "2026-11-10"],
    ["2026-12-31", "monthly", "2027-01-10"],
    ["2026-06-30", "halfYearApproved", "2026-07-10"],
    ["2026-07-01", "halfYearApproved", "2027-01-10"],
    ["2026-12-31", "halfYearApproved", "2027-01-10"],
  ] as const)("%s %s", (d, cycle, expected) => expect(paymentDeadline(d, cycle)).toBe(expected));
});

describe("입력과 공유", () => {
  it("공유 왕복", () => expect(decodeWithholding(encodeWithholding(input()))).toEqual({ ok: true, input: input(), ratesChanged: false }));
  it.each([null, {}, { gross: -1 }, { gross: Infinity }, { gross: 1.5 }, { gross: 1e16 }, { paidAt: "2026-02-30" }, { paidAt: "2027-01-01" }, { kind: "wage" }, { otherCategory: "unknown" }, { actualExpenses: 1_000_001 }, { paymentCycle: "halfYear" }])("잘못된 입력 거부 %j", (p) => {
    const v = p === null ? null : Object.keys(p).length ? { ...input(), ...p } : {};
    expect(isWithholdingInput(v)).toBe(false);
    expect(() => computeWithholding(v as WithholdingInput)).toThrow();
  });
  it.each(["", "broken!", btoa("null"), btoa(JSON.stringify({ v: 1, r: "old", d: {} }))])("손상 링크 거부 %s", (s) => expect(decodeWithholding(s).ok).toBe(false));
  it("이전 스키마 거부", () => expect(decodeWithholding(btoa(JSON.stringify({ v: 0 })))).toEqual({ ok: false, reason: "만료된 형식" }));
  it("이전 세율 버전 경고", () => {
    const s = btoa(JSON.stringify({ v: 1, r: "old", d: input() }));
    expect(decodeWithholding(s)).toEqual({ ok: true, input: input(), ratesChanged: true });
  });
});

describe("원천세 결과 마크업", () => {
  it("금액 팝오버가 문단 안의 div 중첩을 만들지 않는다", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { WithholdingResult } = await import("@/components/withholding/WithholdingResult");
    const html = renderToStaticMarkup(createElement(WithholdingResult, { input: input(), result: computeWithholding(input()) }));
    expect(html).not.toMatch(/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?<div\b/);
    expect(html).toContain("967,000원");
    expect(html).toContain("전제와 미반영");
    expect(html).not.toContain("3%원");
  });
});
