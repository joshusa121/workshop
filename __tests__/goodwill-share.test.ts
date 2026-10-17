import { describe, expect, it } from "vitest";
import { EMPTY_GOODWILL_INPUT, type GoodwillInput } from "../src/lib/tax/goodwill/net-effect";
import { decodeGoodwill, encodeGoodwill } from "../src/lib/tax/goodwill/share";
import { GOODWILL_RATES_VERSION as RATES_VERSION } from "../src/lib/tax/goodwill/facts";

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("goodwill share codec", () => {
  it("왕복", () => {
    const input: GoodwillInput = { netIncomes: [150e6, 120e6, 100e6], equity: 200e6, otherComprehensiveIncome: 50e6, corpTaxBase: 210e6, withRealEstate: true, discountRate: 0.05 };
    const d = decodeGoodwill(encodeGoodwill(input));
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.input).toEqual(input);
      expect(d.ratesChanged).toBe(false);
    }
  });

  it("손상 문자열", () => {
    expect(decodeGoodwill("%%%")).toEqual({ ok: false, reason: "손상된 링크" });
    expect(decodeGoodwill(toBase64Url("\"str\""))).toEqual({ ok: false, reason: "손상된 링크" });
    expect(decodeGoodwill(toBase64Url(JSON.stringify({ v: 1, r: RATES_VERSION, d: { netIncomes: [1, 2] } })))).toEqual({ ok: false, reason: "손상된 링크" });
  });

  it("미래 버전은 만료, 세율 버전 다르면 ratesChanged", () => {
    expect(decodeGoodwill(toBase64Url(JSON.stringify({ v: 99, r: RATES_VERSION, d: EMPTY_GOODWILL_INPUT })))).toEqual({ ok: false, reason: "만료된 형식" });
    const d = decodeGoodwill(toBase64Url(JSON.stringify({ v: 1, r: "1999-9", d: EMPTY_GOODWILL_INPUT })));
    expect(d.ok && d.ratesChanged).toBe(true);
  });

  it("이상한 값은 기본값으로 — 문자열 숫자·범위 밖 할인율", () => {
    const d = decodeGoodwill(toBase64Url(JSON.stringify({ v: 1, r: RATES_VERSION, d: { netIncomes: ["a", 1, null], equity: "x", discountRate: 5 } })));
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.input.netIncomes).toEqual([0, 1, 0]);
      expect(d.input.equity).toBe(0);
      expect(d.input.discountRate).toBe(1);
      expect(d.input.withRealEstate).toBe(false);
    }
  });
});
