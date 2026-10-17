import { describe, expect, it } from "vitest";
import { EMPTY_SCENARIO } from "../src/lib/default-scenario";
import { decodeScenario, encodeScenario } from "../src/lib/share-codec";
import { RATES_VERSION } from "../src/lib/tax/sources";

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("share-codec", () => {
  it("왕복하면 같은 입력", () => {
    const input = { ...EMPTY_SCENARIO, revenue: 600_000_000, accountingProfit: 80_000_000 };
    const decoded = decodeScenario(encodeScenario(input));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.input.revenue).toBe(600_000_000);
      expect(decoded.input.accountingProfit).toBe(80_000_000);
      expect(decoded.ratesChanged).toBe(false);
    }
  });

  it("설립 자본금(capital) 왕복 — 없으면 undefined", () => {
    const withCap = decodeScenario(encodeScenario({ ...EMPTY_SCENARIO, capital: 100_000_000 }));
    expect(withCap.ok && withCap.input.capital).toBe(100_000_000);
    const without = decodeScenario(encodeScenario({ ...EMPTY_SCENARIO, capital: undefined }));
    expect(without.ok && without.input.capital).toBeUndefined();
    const dflt = decodeScenario(encodeScenario(EMPTY_SCENARIO));
    expect(dflt.ok && dflt.input.capital).toBe(50_000_000);
  });

  it("구버전 v=0 도 복원한다", () => {
    const raw = toBase64Url(
      JSON.stringify({ v: 0, r: RATES_VERSION, d: { ...EMPTY_SCENARIO, revenue: 1 } }),
    );
    const decoded = decodeScenario(raw);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.input.revenue).toBe(1);
  });

  it("v2 신규 필드 왕복 (가족·배당액·정관 배수·컷오프 체크)", () => {
    const input = {
      ...EMPTY_SCENARIO,
      familyWorkers: 2,
      familySalaryEach: 40_000_000,
      dividendAmount: 15_000_000,
      retirementMultiple: 3 as const,
      plansRealEstatePurchase: true,
      nonTaxReasons: true,
    };
    const d = decodeScenario(encodeScenario(input));
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.input.familyWorkers).toBe(2);
      expect(d.input.familySalaryEach).toBe(40_000_000);
      expect(d.input.dividendAmount).toBe(15_000_000);
      expect(d.input.retirementMultiple).toBe(3);
      expect(d.input.plansRealEstatePurchase).toBe(true);
      expect(d.input.nonTaxReasons).toBe(true);
    }
  });

  it("v2 범위 밖 값은 기본값으로 — 가족 3명→2, 배수 5→2, 음수 배당→0", () => {
    const raw = toBase64Url(
      JSON.stringify({ v: 2, r: RATES_VERSION, d: { ...EMPTY_SCENARIO, familyWorkers: 3, retirementMultiple: 5, dividendAmount: -1 } }),
    );
    const d = decodeScenario(raw);
    expect(d.ok && d.input.familyWorkers).toBe(2);
    expect(d.ok && d.input.retirementMultiple).toBe(2);
    expect(d.ok && d.input.dividendAmount).toBe(0);
  });

  it("v1 payload(배당성향)를 연 배당액으로 변환 — SC4 50% → 11,156,609", () => {
    const v1 = {
      revenue: 300_000_000,
      accountingProfit: 80_000_000,
      taxAdjustment: 0,
      industryGroup: "서비스임대",
      workplace: { sido: "서울특별시" },
      assets: { total: 200_000_000, realEstate: 50_000_000, housing: 0 },
      liabilities: 40_000_000,
      ownerSalary: 48_000_000,
      dividendPayoutRatio: 0.5,
      retirementPlan: false,
      bookkeepingType: "복식부기",
      sincereFilingConfirmCost: 0,
      voluntaryEmploymentIns: false,
      voluntaryWorkersComp: false,
      personalContext: { otherIncome: 0 },
    };
    const d = decodeScenario(toBase64Url(JSON.stringify({ v: 1, r: RATES_VERSION, d: v1 })));
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.input.dividendAmount).toBe(11_156_609);
      // v1에 없던 필드는 기본값. 단 자본금은 v1에서 비워 둔 의미(순자산 대용)를 지킨다
      expect(d.input.familyWorkers).toBe(0);
      expect(d.input.retirementMultiple).toBe(2);
      expect(d.input.capital).toBeUndefined();
    }
  });

  it("세율 버전이 다르면 ratesChanged", () => {
    const raw = toBase64Url(JSON.stringify({ v: 2, r: "1999-9", d: EMPTY_SCENARIO }));
    const decoded = decodeScenario(raw);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.ratesChanged).toBe(true);
  });

  it("손상 문자열", () => {
    expect(decodeScenario("%%%")).toEqual({ ok: false, reason: "손상된 링크" });
  });

  it("미래 버전은 만료", () => {
    const raw = toBase64Url(JSON.stringify({ v: 99, r: RATES_VERSION, d: EMPTY_SCENARIO }));
    expect(decodeScenario(raw)).toEqual({ ok: false, reason: "만료된 형식" });
  });
});
