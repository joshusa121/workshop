import { describe, expect, it } from "vitest";
import { computeStartupRelief } from "../src/lib/tax/startup-relief/engine";
import { normalizeStartupRelief, type StartupReliefInput } from "../src/lib/tax/startup-relief/input";
import { decodeStartupRelief, encodeStartupRelief } from "../src/lib/tax/startup-relief/share";

// 기대값은 docs/verified/startup-relief-hand-calc-fixtures.md의 독립 손계산값.
const base = {
  startupDate: "2026-01-01", taxYear: 2026, firstIncomeYear: 2026,
  region: "outside", youth: "yes", sme: "yes", industry: "manufacturing",
  startupKind: "new", specialCase: false, annualRevenue: 200_000_000,
  eligibleTax: 10_000_000,
} satisfies StartupReliefInput;
const run = (patch: Partial<StartupReliefInput> = {}) => computeStartupRelief({ ...base, ...patch });

describe("창업 감면 독립 손계산 fixture", () => {
  it.each([
    ["F01 지방 청년", {}, 1, 10_000_000],
    ["F02 수도권 비과밀 청년", { region: "capital" }, 0.75, 7_500_000],
    ["F03 과밀 청년", { region: "overcrowded" }, 0.5, 5_000_000],
    ["F04 수도권 비과밀 일반", { region: "capital", youth: "no" }, 0.25, 2_500_000],
    ["F05 지방 일반", { youth: "no" }, 0.5, 5_000_000],
    ["F06 과밀 일반", { region: "overcrowded", youth: "no" }, 0, 0],
    ["F07 수입금액 경계 포함", { region: "capital", youth: "no", annualRevenue: 104_000_000 }, 0.75, 7_500_000],
    ["F08 수입금액 경계 초과", { region: "capital", youth: "no", annualRevenue: 104_000_001 }, 0.25, 2_500_000],
    ["F09 연간 한도", { eligibleTax: 700_000_000 }, 1, 500_000_000],
    ["F10 개정 전날 창업", { startupDate: "2025-12-31", region: "capital" }, 1, 10_000_000],
    ["F11 감면 마지막 연도", { taxYear: 2030 }, 1, 10_000_000],
    ["F12 감면 종료 다음 연도", { taxYear: 2031 }, 0, 0],
    ["F13 수도권 인구감소 청년", { region: "depopulation" }, 1, 10_000_000],
    ["F14 수도권 인구감소 일반", { region: "depopulation", youth: "no" }, 0.5, 5_000_000],
    ["F15 수입금액 특례 과밀", { region: "overcrowded", youth: "no", annualRevenue: 104_000_000 }, 0.5, 5_000_000],
    ["F16 원 미만 버림", { region: "capital", eligibleTax: 10_000_001 }, 0.75, 7_500_000],
    ["F17 한도와 같은 금액", { eligibleTax: 500_000_000 }, 1, 500_000_000],
    ["F18 한도보다 1원 적은 금액", { eligibleTax: 499_999_999 }, 1, 499_999_999],
    ["F19 2025 일반창업 기본율", { startupDate: "2025-12-31", region: "capital", youth: "no" }, 0.5, 5_000_000],
    ["F20 2025 일반창업 수입특례", { startupDate: "2025-12-31", region: "capital", youth: "no", annualRevenue: 104_000_000 }, 1, 10_000_000],
  ] as [string, Partial<StartupReliefInput>, number, number][])("%s", (_, patch, rate, amount) => {
    const r = run(patch);
    expect(r.status).not.toBe("review");
    expect(r.rate?.value).toBe(rate);
    expect(r.relief?.value).toBe(amount);
  });

  it("법인전환은 창업이 아니므로 청년·소액수입도 적용하지 않는다", () => {
    const r = run({ startupKind: "conversion", annualRevenue: 0 });
    expect(r.status).toBe("ineligible");
    expect(r.relief?.value).toBe(0);
    expect(r.reasons.join()).toContain("법인전환");
  });
  it("동종 재창업·확장은 제외하며 승계는 예외 확인을 위해 감수로 보낸다", () => {
    expect(run({ startupKind: "restart" }).relief?.value).toBe(0);
    expect(run({ startupKind: "expansion" }).relief?.value).toBe(0);
    expect(run({ startupKind: "succession" }).relief).toBeNull();
  });
  it("업종 제외와 중소기업 부적격을 감면하지 않는다", () => {
    expect(run({ industry: "excluded" }).relief?.value).toBe(0);
    expect(run({ sme: "no" }).relief?.value).toBe(0);
  });
  it.each([{ youth: "unknown" }, { sme: "unknown" }, { region: "unknown" }, { industry: "unknown" }, { specialCase: true } ] as Partial<StartupReliefInput>[])("미확인 요건·특수사례는 금액을 만들지 않는다: %j", (p) => {
    const r = run(p);
    expect(r.status).toBe("review");
    expect(r.relief).toBeNull();
  });
  it("2024년 이전 창업은 새 한도를 소급 적용하지 않는다", () => {
    const r = run({ startupDate: "2024-12-31", eligibleTax: 700_000_000 });
    expect(r.status).toBe("review");
    expect(r.relief).toBeNull();
  });
  it("일몰일은 포함하고 그 다음 날은 현행 규정상 제외한다", () => {
    expect(run({ startupDate: "2027-12-31", taxYear: 2027, firstIncomeYear: 2027 }).relief?.value).toBe(10_000_000);
    expect(run({ startupDate: "2028-01-01", taxYear: 2028, firstIncomeYear: 2028 }).relief?.value).toBe(0);
  });
  it("첫 소득이 늦어져도 창업 후 5년이 되는 연도부터 기간을 센다", () => {
    const r = run({ firstIncomeYear: null, eligibleTax: 0 });
    expect(r.periodStart?.value).toBe(2031);
    expect(r.periodEnd?.value).toBe(2035);
    expect(r.relief?.value).toBe(0);
    expect(run({ firstIncomeYear: 2033, taxYear: 2033 }).periodStart?.value).toBe(2031);
    expect(run({ firstIncomeYear: 2033, taxYear: 2036 }).relief?.value).toBe(0);
  });
  it("무소득 응답에 양수 산출세액이 들어오면 계산하지 않는다", () => {
    expect(run({ firstIncomeYear: null }).status).toBe("review");
  });
  it.each([
    { startupDate: "2026-02-30" }, { taxYear: 2025 }, { taxYear: 2026.5 },
    { firstIncomeYear: 2025 }, { annualRevenue: -1 }, { eligibleTax: Infinity },
    { firstIncomeYear: 2027 }, { startupDate: "" },
  ] as Partial<StartupReliefInput>[])("잘못되거나 모순된 입력은 감수로 보낸다: %j", (p) => {
    expect(run(p).status).toBe("review");
  });
  it("0원도 계산근거를 유지하며 최저한세 전 금액만 제공한다", () => {
    const r = run({ eligibleTax: 0 });
    expect(r.relief?.value).toBe(0);
    expect(r.relief?.basis.some(b => b.kind === "law")).toBe(true);
    expect(r.notes.join()).toContain("최저한세");
  });
});

describe("공유 입력 검증", () => {
  it("공유 URL 왕복과 세율 버전 변경을 감지한다", () => {
    expect(decodeStartupRelief(encodeStartupRelief(base))).toEqual({ ok: true, input: base, ratesChanged: false });
    const old = btoa(JSON.stringify({ v: 1, r: "old", d: base }));
    const d = decodeStartupRelief(old);
    expect(d.ok && d.ratesChanged).toBe(true);
  });
  it.each(["!broken", btoa("null"), btoa(JSON.stringify({ v: 1, d: [] })), btoa(JSON.stringify({ v: 1, d: {} })), btoa(JSON.stringify({ v: 1, d: { ...base, youth: "yes-ish" } })), btoa(JSON.stringify({ v: 1, d: { ...base, eligibleTax: -1 } })), btoa(JSON.stringify({ v: 1, d: { ...base, specialCase: "false" } }))])("손상된 링크가 기본 예시로 둔갑하지 않는다: %s", code => {
    expect(decodeStartupRelief(code).ok).toBe(false);
  });
  it("정규화 시 미확인 요건을 임의로 충족 처리하지 않는다", () => {
    const input = normalizeStartupRelief({ youth: "garbage" as never, sme: "garbage" as never });
    expect(input.youth).toBe("unknown");
    expect(input.sme).toBe("unknown");
  });
});
