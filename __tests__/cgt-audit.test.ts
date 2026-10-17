/**
 * Phase 3 감사 — fixture와 다른 신규 3케이스(독립 손계산, 엔진과 별도 Python 스크립트로 계산) + 극단값·링크.
 * 근거: docs/verified/cgt-final-audit.md
 */
import { describe, expect, it } from "vitest";
import { computeCgt } from "../src/lib/tax/cgt/cgt";
import { isComplete } from "../src/lib/tax/cgt/defaults";
import type { CgtInput } from "../src/lib/tax/cgt/input";
import { decodeCgt, encodeCgt } from "../src/lib/tax/cgt/share";
import { CGT_RATES_VERSION as RATES_VERSION } from "../src/lib/tax/cgt/version";

const base = (s: Partial<CgtInput["subject"]>, h: Partial<CgtInput["household"]> = {}, extra: Partial<CgtInput> = {}): CgtInput => ({
  subject: {
    kind: "house", acquiredAt: "2020-01-01", transferredAt: "2026-09-01", acquisitionPrice: 0, transferPrice: 0,
    capitalExpenditure: 0, transferCost: 0, residenceMonths: 0, adjustedAtAcquisition: false, adjustedAtTransfer: false, registered: true, ...s,
  },
  household: { others: [], special: { type: "none" }, ...h },
  ...extra,
});

describe("N1 혼인 합가 특례 + 고가(18억), 보유 12년·거주 6년", () => {
  const r = computeCgt(base(
    { acquiredAt: "2014-05-01", acquisitionPrice: 800_000_000, transferPrice: 1_800_000_000, residenceMonths: 72 },
    { others: [{ kind: "house", acquiredAt: "2018-01-01" }], special: { type: "marriage", eventDate: "2020-10-10" } },
  ));
  it("특례 1주택 → 표2 64%", () => {
    expect(r.status.category).toBe("special_one");
    expect(r.taxableGain.value).toBe(333_333_333);
    expect(r.ltcg.value).toBe(213_333_333);
    expect(r.taxBase.value).toBe(117_500_000);
    expect(r.tax.value).toBe(25_685_000);
    expect(r.localTax.value).toBe(2_568_500);
  });
});

describe("N2 1주택 보유 1년 6개월 → 60%", () => {
  const r = computeCgt(base({ acquiredAt: "2025-03-01", acquisitionPrice: 600_000_000, transferPrice: 700_000_000, transferCost: 4_000_000 }));
  it("60% 56,100,000 > 기본세율 17,285,000", () => {
    expect(r.taxBase.value).toBe(93_500_000);
    expect(r.tax.value).toBe(56_100_000);
    expect(r.localTax.value).toBe(5_610_000);
  });
});

describe("N3 원조합원 신축주택 + 청산금 납부 (§166②1호)", () => {
  const r = computeCgt(base(
    { acquiredAt: "2010-06-01", acquisitionPrice: 200_000_000, transferPrice: 1_200_000_000, transferCost: 10_000_000 },
    { others: [{ kind: "house", acquiredAt: "2021-01-01" }] },
    { redevelopment: { role: "original", approvalDate: "2019-05-01", appraisal: 500_000_000, settlement: { type: "paid", amount: 100_000_000 }, transferAsNewHouse: true, completionDate: "2023-03-01" } },
  ));
  it("청산금납부분(7년 14%)·기존건물분(16년 30%) 나눠 장특", () => {
    expect(r.redevelopment?.settlementPortion?.value).toBe(98_333_333);
    expect(r.redevelopment?.existingPortion?.value).toBe(791_666_666);
    expect(r.ltcg.value).toBe(13_766_666 + 237_499_999);
    expect(r.incomeAmount.value).toBe(638_733_334);
    expect(r.taxBase.value).toBe(636_233_334);
    expect(r.tax.value).toBe(231_278_000);
    expect(r.localTax.value).toBe(23_127_800);
  });
});

describe("극단값", () => {
  it("판 값 0원은 계산하지 않는다(입력 미완성)", () => {
    expect(isComplete(base({ transferPrice: 0 }))).toBe(false);
  });
  it("산 값 0원(증여 등 오입력)도 음수·NaN 없이 계산", () => {
    const r = computeCgt(base({ acquiredAt: "2024-01-01", transferPrice: 100_000_000 }, { others: [{ kind: "house", acquiredAt: "2019-01-01" }] }));
    expect(Number.isFinite(r.total.value)).toBe(true);
    expect(r.total.value).toBeGreaterThan(0);
  });
  it("양도차손은 0원", () => {
    const r = computeCgt(base({ acquisitionPrice: 900_000_000, transferPrice: 500_000_000 }, { others: [{ kind: "house", acquiredAt: "2019-01-01" }] }));
    expect(r.taxBase.value).toBe(0);
    expect(r.total.value).toBe(0);
  });
  it("100억 다주택 중과, 1년 미만 — 70%와 중과 중 큰 세액", () => {
    const r = computeCgt(base(
      { acquiredAt: "2026-01-01", acquisitionPrice: 9_000_000_000, transferPrice: 10_000_000_000, adjustedAtTransfer: true },
      { others: [{ kind: "house", acquiredAt: "2015-01-01" }, { kind: "house", acquiredAt: "2016-01-01" }] },
    ));
    // 과표 997,500,000 × 70% = 698,250,000 / 중과 +30%p = 94,060,000 + … (손계산: 14,000,000×36% + 36,000,000×45% + 38,000,000×54% + 62,000,000×65% + 150,000,000×68% + 200,000,000×70% + 497,500,000×72% = 5,040,000 + 16,200,000 + 20,520,000 + 40,300,000 + 102,000,000 + 140,000,000 + 358,200,000 = 682,260,000)
    expect(r.taxBase.value).toBe(997_500_000);
    expect(r.tax.value).toBe(698_250_000);
    expect(r.tax.steps.join(" ")).toContain("682,260,000");
  });
});

describe("공유 링크", () => {
  it("세율 버전이 바뀐 옛 링크는 복원하되 ratesChanged 표시", () => {
    const input = base({ acquisitionPrice: 1, transferPrice: 2 });
    const old = btoa(JSON.stringify({ v: 1, r: "2026-1", d: input })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const d = decodeCgt(old);
    expect(d.ok && d.ratesChanged).toBe(true);
    expect(decodeCgt(encodeCgt(input))).toMatchObject({ ok: true, ratesChanged: false });
    expect(RATES_VERSION).toBeTruthy();
  });
});
