import { describe, expect, it } from "vitest";
import { computeSincereFiling } from "@/lib/tax/sincere-filing/engine";
import { DEFAULT_INPUT, validateInput, type SincereInput } from "@/lib/tax/sincere-filing/input";
import { decodeSincere, encodeSincere } from "@/lib/tax/sincere-filing/share";
import { SINCERE_VERSION } from "@/lib/tax/sincere-filing/version";

const url64 = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const input = (patch: Partial<SincereInput> = {}): SincereInput => ({ ...DEFAULT_INPUT, current: [0, 0, 0], previous: [0, 0, 0], ...patch });

// 독립 손계산 기대값. 계산식은 docs/verified/sincere-filing-hand-calc-fixtures.md。
describe("성실신고 독립 손계산 fixture", () => {
  it.each([
    ["도소매 경계 직전", [1_499_999_999, 0, 0], false],
    ["도소매 경계", [1_500_000_000, 0, 0], true],
    ["제조·음식 경계 직전", [0, 749_999_999, 0], false],
    ["제조·음식 경계", [0, 750_000_000, 0], true],
    ["임대·서비스 경계 직전", [0, 0, 499_999_999], false],
    ["임대·서비스 경계", [0, 0, 500_000_000], true],
    ["겸업 경계", [900_000_000, 300_000_000, 0], true],
    ["겸업 경계 직전", [899_999_999, 300_000_000, 0], false],
    ["세 업종 겸업", [300_000_000, 150_000_000, 300_000_000], true],
  ] as const)("%s", (_name, amounts, target) => {
    const r = computeSincereFiling(input({ current: [...amounts] }));
    expect(r.target).toBe(target);
    expect(r.currentTotal.value).toBe(amounts.reduce((a: number, b) => a + b, 0));
  });
  it.each([
    [[299_999_999, 0, 0], false], [[300_000_000, 0, 0], true],
    [[0, 149_999_999, 0], false], [[0, 150_000_000, 0], true],
    [[0, 0, 74_999_999], false], [[0, 0, 75_000_000], true],
    [[150_000_000, 0, 37_500_000], true],
  ] as const)("복식부기 직전연도 %j → %s", (amounts, expected) => {
    expect(computeSincereFiling(input({ previous: [...amounts] })).doubleEntry).toBe(expected);
  });
  it("당해 성실신고와 직전연도 복식부기를 서로 대신하지 않는다", () => {
    const r = computeSincereFiling(input({ current: [1_500_000_000, 0, 0] }));
    expect(r.target).toBe(true);
    expect(r.doubleEntry).toBe(false);
  });
  it("신규사업은 간편장부, 배제대상 전문직은 복식부기", () => {
    expect(computeSincereFiling(input({ newBusiness: true, previous: [300_000_000, 0, 0] })).doubleEntry).toBe(false);
    expect(computeSincereFiling(input({ newBusiness: true, excludedFromSimple: true })).doubleEntry).toBe(true);
  });
  it.each([[1_000_000, 600_000], [2_000_000, 1_200_000], [3_000_000, 1_200_000], [0, 0], [1, 0]])("확인비용 %s → 공제 산식상 한도 %s", (cost, expected) => {
    const r = computeSincereFiling(input({ current: [0, 0, 500_000_000], confirmationCost: cost, submitted: true }));
    expect(r.creditEstimate.value).toBe(expected);
    expect(r.creditAvailable).toBe(true);
    expect(r.deadline).toBe("2027-06-30");
  });
  it("비대상 또는 확인서 미제출은 비용공제 대상 안내를 하지 않는다", () => {
    expect(computeSincereFiling(input({ confirmationCost: 2_000_000, submitted: true })).creditAvailable).toBe(false);
    const r = computeSincereFiling(input({ current: [0, 0, 500_000_000], confirmationCost: 2_000_000 }));
    expect(r.creditAvailable).toBe(false);
    expect(r.deadline).toBe("2027-05-31");
    expect(r.creditEstimate.value).toBe(0);
  });
  it("특수상황은 비대상으로 단정하지 않고 Josh 감수로 유보", () => {
    const r = computeSincereFiling(input({ needsReview: true, submitted: true }));
    expect(r.target).toBeNull();
    expect(r.doubleEntry).toBeNull();
    expect(r.deadline).toBeNull();
    expect(r.creditAvailable).toBe(false);
  });
});

describe("입력과 공유 URL", () => {
  it("입력 왕복", () => {
    const i = input({ current: [100, 200, 300], excludedFromSimple: true, confirmationCost: 123 });
    expect(decodeSincere(encodeSincere(i))).toEqual({ ok: true, input: i, ratesChanged: false });
  });
  it.each(["!", "", btoa("null"), url64(JSON.stringify({ v: 1, r: SINCERE_VERSION, d: {} }))])("손상된 링크 거절 %s", code => {
    expect(decodeSincere(code).ok).toBe(false);
  });
  it("버전 차이 표시", () => {
    const code = url64(JSON.stringify({ v: 1, r: "old", d: input() }));
    expect(decodeSincere(code)).toMatchObject({ ok: true, ratesChanged: true });
    expect(decodeSincere(url64(JSON.stringify({ v: 9, d: input() })))).toMatchObject({ ok: false, reason: "만료된 형식" });
  });
  it.each([-1, Infinity, NaN, 0.5, Number.MAX_SAFE_INTEGER])("잘못된 금액 거절 %s", value => {
    expect(validateInput(input({ current: [value, 0, 0] })).length).toBeGreaterThan(0);
    expect(() => computeSincereFiling(input({ confirmationCost: value }))).toThrow();
  });
  it("지원하지 않는 연도와 배열 및 boolean 위조 거절", () => {
    expect(validateInput({ ...input(), year: 2025 }).length).toBeGreaterThan(0);
    expect(decodeSincere(url64(JSON.stringify({ v: 1, d: { ...input(), submitted: "yes" } }))).ok).toBe(false);
    expect(validateInput({ ...input(), current: [0, 0] }).length).toBeGreaterThan(0);
  });
  it("큰 금액에서도 주업종 환산액이 1원 줄지 않는다", () => {
    const r = computeSincereFiling(input({ current: [999_999_999_006, 0, 0], previous: [999_999_999_000, 0, 0] }));
    expect(r.sincereConverted.value).toBe(999_999_999_006);
    expect(r.bookConverted.value).toBe(999_999_999_000);
  });
  it("계산된 모든 숫자에 근거와 과정이 있다", () => {
    const r = computeSincereFiling(input({ current: [1_500_000_000, 0, 0] }));
    for (const trace of [r.currentTotal, r.previousTotal, r.sincereConverted, r.bookConverted, r.sincereThreshold, r.bookThreshold, r.gap, r.creditEstimate]) {
      expect(trace.basis.length).toBeGreaterThan(0);
      expect(trace.steps.length).toBeGreaterThan(0);
    }
  });
});
