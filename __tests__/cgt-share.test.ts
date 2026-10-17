import { describe, expect, it } from "vitest";
import type { CgtInput } from "../src/lib/tax/cgt/input";
import { decodeCgt, encodeCgt } from "../src/lib/tax/cgt/share";
import { CGT_RATES_VERSION as RATES_VERSION } from "../src/lib/tax/cgt/version";

const sample: CgtInput = {
  subject: {
    kind: "house",
    acquiredAt: "2016-03-02",
    transferredAt: "2026-09-01",
    acquisitionPrice: 1_000_000_000,
    transferPrice: 2_000_000_000,
    capitalExpenditure: 10_000_000,
    transferCost: 10_000_000,
    residenceMonths: 125,
    adjustedAtAcquisition: true,
    adjustedAtTransfer: true,
    registered: true,
  },
  household: {
    others: [{ kind: "presale", acquiredAt: "2024-01-01", nonMetroLowValue: true }],
    special: { type: "marriage", eventDate: "2020-05-05" },
  },
  redevelopment: {
    role: "original",
    approvalDate: "2022-06-01",
    appraisal: 700_000_000,
    settlement: { type: "received", amount: 100_000_000 },
    transferAsNewHouse: false,
  },
  transitional: { contractDate: "2026-04-01", landPermit: true, permitAppliedAt: "2026-04-10", sixMonthRegion: true },
};

describe("cgt share codec", () => {
  it("라운드트립", () => {
    const r = decodeCgt(encodeCgt(sample));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input).toEqual(sample);
      expect(r.ratesChanged).toBe(false);
    }
  });
  it("URL-safe 문자만", () => {
    expect(encodeCgt(sample)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("손상 문자열·잘못된 날짜", () => {
    expect(decodeCgt("!!!")).toEqual({ ok: false, reason: "손상된 링크" });
    const bad = btoa(JSON.stringify({ v: 1, r: RATES_VERSION, d: { subject: { acquiredAt: "2026-02-30", transferredAt: "2026-09-01" } } }));
    expect(decodeCgt(bad)).toEqual({ ok: false, reason: "손상된 링크" });
  });
  it("구버전 스키마는 만료", () => {
    const old = btoa(JSON.stringify({ v: 0, r: RATES_VERSION, d: {} }));
    expect(decodeCgt(old)).toEqual({ ok: false, reason: "만료된 형식" });
  });
  it("세율 버전 다르면 ratesChanged", () => {
    const s = btoa(JSON.stringify({ v: 1, r: "1999-0", d: sample })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const r = decodeCgt(s);
    expect(r.ok && r.ratesChanged).toBe(true);
  });
  it("누락 필드는 기본값으로 복원", () => {
    const s = btoa(JSON.stringify({ v: 1, r: RATES_VERSION, d: { subject: { acquiredAt: "2020-01-01", transferredAt: "2026-01-01" } } }));
    const r = decodeCgt(s);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.subject.registered).toBe(true);
      expect(r.input.household.others).toEqual([]);
      expect(r.input.household.special).toEqual({ type: "none" });
    }
  });
});
