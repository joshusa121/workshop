import { describe, expect, it } from "vitest";
import { computeLoanToOwner } from "../src/lib/tax/loan-to-owner/engine";
import { DEFAULT_LOAN_INPUT, type LoanToOwnerInput } from "../src/lib/tax/loan-to-owner/input";
import { decodeLoanToOwner, encodeLoanToOwner } from "../src/lib/tax/loan-to-owner/share";

const input = (patch: Partial<LoanToOwnerInput> = {}): LoanToOwnerInput => ({
  ...DEFAULT_LOAN_INPUT, periods: [{ balance: 100_000_000, days: 365 }],
  rateMode: "overdraft", overdraftConfirmed: true, ...patch,
});

describe("가지급금 독립 손계산 fixture", () => {
  it.each([
    ["무이자 연간", 365, 0, 4_600_000, 4_600_000],
    ["반기 보유", 180, 0, 2_268_493, 2_268_493],
    ["차액 5% 직전", 365, 4_370_001, 4_600_000, 0],
    ["차액 5% 정확히", 365, 4_370_000, 4_600_000, 230_000],
    ["정상이자 전액 수취", 365, 4_600_000, 4_600_000, 0],
    ["정상이자 초과 수취", 365, 5_000_000, 4_600_000, 0],
  ])("%s", (_, days, actualInterest, gross, adjustment) => {
    const r = computeLoanToOwner(input({ periods: [{ balance: 100_000_000, days }], actualInterest }));
    expect(r.normalInterest.value).toBe(gross);
    expect(r.recognizedInterest.value).toBe(adjustment);
  });
  it("잔액이 바뀐 기간 적수를 합산한다", () => {
    const r = computeLoanToOwner(input({ periods: [{ balance: 100_000_000, days: 100 }, { balance: 50_000_000, days: 200 }] }));
    expect(r.balanceDays.value).toBe(20_000_000_000);
    expect(r.normalInterest.value).toBe(2_520_547);
  });
  it("입력한 가중평균차입이자율을 사용한다", () => {
    const r = computeLoanToOwner(input({ rateMode: "weighted", weightedRatePercent: 6 }));
    expect(r.normalInterest.value).toBe(6_000_000);
  });
  it("지급이자 제한과 인정이자를 구분하고 법인 세율 경계를 넘긴다", () => {
    const r = computeLoanToOwner(input({ averageBorrowings: 200_000_000, borrowingInterest: 10_000_000, corpTaxBase: 199_000_000 }));
    expect(r.disallowedInterest.value).toBe(5_000_000);
    expect(r.incomeAddition.value).toBe(9_600_000);
    expect(r.corpTaxIncrease.value).toBe(1_820_000);
    expect(r.localTaxIncrease.value).toBe(182_000);
    expect(r.totalCorpTaxIncrease.value).toBe(2_002_000);
    expect(r.personalIncomeAddition.value).toBe(4_600_000);
  });
  it("가지급금이 총차입금을 넘어도 지급이자 이상을 부인하지 않는다", () => {
    const r = computeLoanToOwner(input({ averageBorrowings: 50_000_000, borrowingInterest: 3_000_000 }));
    expect(r.disallowedInterest.value).toBe(3_000_000);
  });
  it("부분기간의 지급이자 제한은 연간 차입금 적수와 비교한다", () => {
    const r = computeLoanToOwner(input({ periods: [{ balance: 100_000_000, days: 180 }], averageBorrowings: 200_000_000, borrowingInterest: 10_000_000 }));
    expect(r.disallowedInterest.value).toBe(2_465_753);
  });
  it.each([
    [19_999_000_000, 992_000, 99_200],
    [299_999_000_000, 1_120_000, 112_000],
  ])("기존 과표 %i에서 상위 법인세 구간을 나누어 계산한다", (corpTaxBase, national, local) => {
    const r = computeLoanToOwner(input({ corpTaxBase }));
    expect(r.corpTaxIncrease.value).toBe(national);
    expect(r.localTaxIncrease.value).toBe(local);
  });
  it("차액이 5% 미만이어도 3억원이면 전액 조정한다", () => {
    const r = computeLoanToOwner(input({ periods: [{ balance: 200_000_000_000, days: 365 }], actualInterest: 8_900_000_000 }));
    expect(r.recognizedInterest.value).toBe(300_000_000);
  });
  it("3억원 직전이며 5% 미만이면 조정하지 않는다", () => {
    const r = computeLoanToOwner(input({ periods: [{ balance: 200_000_000_000, days: 365 }], actualInterest: 8_900_000_001 }));
    expect(r.recognizedInterest.value).toBe(0);
  });
  it("잔액이 없으면 과세 위험을 만들어내지 않는다", () => {
    const r = computeLoanToOwner(input({ periods: [{ balance: 0, days: 365 }] }));
    expect(r.totalCorpTaxIncrease.value).toBe(0);
    expect(r.recognizedInterest.value).toBe(0);
  });
  it("대표이사는 주주 여부와 관계없이 상여, 비임원 주주는 배당으로 분류한다", () => {
    expect(computeLoanToOwner(input({ recipient: "director" })).disposition).toBe("상여(근로소득)");
    expect(computeLoanToOwner(input({ recipient: "shareholder" })).disposition).toBe("배당소득");
  });
  it("숫자에는 원문 또는 입력 가정과 계산 과정이 있다", () => {
    const r = computeLoanToOwner(input());
    for (const t of [r.balanceDays, r.normalInterest, r.recognizedInterest, r.disallowedInterest, r.corpTaxIncrease, r.localTaxIncrease]) {
      expect(t.basis.length).toBeGreaterThan(0);
      expect(t.steps.length).toBeGreaterThan(0);
    }
  });
});

describe("입력 및 공유 URL 안전성", () => {
  it.each([
    { periods: [{ balance: -1, days: 365 }] },
    { periods: [{ balance: 1, days: 366 }] },
    { periods: [{ balance: 1, days: 200 }, { balance: 1, days: 166 }] },
    { periods: [] }, { actualInterest: NaN }, { corpTaxBase: Infinity },
    { rateMode: "weighted", weightedRatePercent: null },
    { rateMode: "overdraft", overdraftConfirmed: false },
    { averageBorrowings: 0, borrowingInterest: 1 },
  ] as Partial<LoanToOwnerInput>[])('잘못된 입력을 조용히 계산하지 않는다: %j', (patch) => {
    expect(() => computeLoanToOwner(input(patch))).toThrow();
  });
  it("공유 URL 왕복 시 기간과 이자율을 유지한다", () => {
    const original = input({ rateMode: "weighted", weightedRatePercent: 5.12, recipient: "shareholder" });
    expect(decodeLoanToOwner(encodeLoanToOwner(original))).toEqual({ ok: true, input: original, ratesChanged: false });
  });
  it.each(["!", "", btoa('{}'), btoa(JSON.stringify({ v: 1, r: "2026-1", d: {} }))])("손상된 입력을 예시로 대체하지 않는다: %s", (s) => {
    expect(decodeLoanToOwner(s).ok).toBe(false);
  });
  it("세율 버전이 다르면 경고를 반환한다", () => {
    const s = btoa(JSON.stringify({ v: 1, r: "old", d: input() }));
    expect(decodeLoanToOwner(s)).toMatchObject({ ok: true, ratesChanged: true });
  });
  it("다른 스키마는 복원하지 않는다", () => {
    expect(decodeLoanToOwner(btoa(JSON.stringify({ v: 99, d: input() })))).toEqual({ ok: false, reason: "만료된 형식" });
  });
});
