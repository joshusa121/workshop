/**
 * 홈택스 「양도소득세 간편계산」·「장기보유특별공제 계산기」 실측값 고정 (2026-09-26, Aside 브라우저로 입력·판독).
 * 출처: docs/verified/cgt-cross-check.md. 기대값은 손계산이 아니라 홈택스 화면에 표시된 숫자다.
 */
import { describe, expect, it } from "vitest";
import { applyBrackets } from "../src/lib/tax/progressive";
import { INCOME_TAX_BRACKETS } from "../src/lib/tax/rates";
import { floorTenWon } from "../src/lib/tax/rounding";
import { computeCgt } from "../src/lib/tax/cgt/cgt";
import type { CgtInput } from "../src/lib/tax/cgt/input";
import { ltcgDeduction } from "../src/lib/tax/cgt/ltcg-deduction";
import { fullYears } from "../src/lib/tax/cgt/period";

const base = (s: Partial<CgtInput["subject"]>, others: CgtInput["household"]["others"] = []): CgtInput => ({
  subject: {
    kind: "house", acquiredAt: "2020-01-15", transferredAt: "2026-09-01", acquisitionPrice: 0, transferPrice: 0,
    capitalExpenditure: 0, transferCost: 0, residenceMonths: 0, adjustedAtAcquisition: false, adjustedAtTransfer: false, registered: true, ...s,
  },
  household: { others, special: { type: "none" } },
});

describe("X1 단기 1년 미만 70% (홈택스 간편계산 전 항목)", () => {
  it("과표 42,500,000 / 세율 70% / 산출 29,750,000", () => {
    const r = computeCgt(base({ acquiredAt: "2026-01-10", acquisitionPrice: 500_000_000, transferPrice: 550_000_000, transferCost: 5_000_000 }));
    expect(r.gain.value).toBe(45_000_000);
    expect(r.ltcg.value).toBe(0);
    expect(r.basicDeduction.value).toBe(2_500_000);
    expect(r.taxBase.value).toBe(42_500_000);
    expect(r.tax.value).toBe(29_750_000);
  });
});

describe("X2 조정지역 1세대 2주택 중과 (홈택스 간편계산 전 항목, 세율 60% 표시)", () => {
  it("장특 0 / 과표 397,500,000 / 산출 212,560,000", () => {
    const r = computeCgt(base({ acquisitionPrice: 500_000_000, transferPrice: 900_000_000, adjustedAtTransfer: true }, [{ kind: "house", acquiredAt: "2023-06-01" }]));
    expect(r.gain.value).toBe(400_000_000);
    expect(r.ltcg.value).toBe(0);
    expect(r.taxBase.value).toBe(397_500_000);
    expect(r.tax.value).toBe(212_560_000);
  });
});

describe("X3 고가주택 1세대1주택 20억 (간편계산 과세대상 양도차익 + 장특 계산기)", () => {
  const r = computeCgt(base({ acquiredAt: "2016-03-02", acquisitionPrice: 1_000_000_000, transferPrice: 2_000_000_000, capitalExpenditure: 10_000_000, transferCost: 10_000_000, residenceMonths: 125 }));
  it("전체 양도차익 980,000,000 / 과세대상 392,000,000", () => {
    expect(r.gain.value).toBe(980_000_000);
    expect(r.taxableGain.value).toBe(392_000_000);
  });
  it("장특(1세대1주택 80% 한도, 보유 10년 이상·거주 10년 이상) 313,600,000", () => {
    expect(r.ltcg.value).toBe(313_600_000);
  });
});

describe("X4 일반 2주택(비조정) 장특 표1 6년 (장특 계산기)", () => {
  it("400,000,000 × 12% = 48,000,000", () => {
    const r = computeCgt(base({ acquisitionPrice: 500_000_000, transferPrice: 900_000_000 }, [{ kind: "house", acquiredAt: "2023-06-01" }]));
    expect(r.ltcg.value).toBe(48_000_000);
  });
  it("장특 미입력 간편계산: 과표 397,500,000 → 산출 133,060,000 (기본세율 40% 구간)", () => {
    expect(applyBrackets(397_500_000, INCOME_TAX_BRACKETS, "x", floorTenWon).value).toBe(133_060_000);
  });
});

describe("X5·X6 보유기간 기산 (장특 계산기가 날짜로 자동 선택한 구간)", () => {
  it("2023-09-02 → 2026-09-01: 3년 이상 4년 미만", () => {
    expect(fullYears("2023-09-02", "2026-09-01")).toBe(3);
  });
  it("2023-09-03 → 2026-09-01: 3년 미만", () => {
    expect(fullYears("2023-09-03", "2026-09-01")).toBe(2);
  });
  it("표2 보유 3년·거주 2년: 85,714,285 × 20% = 17,142,857", () => {
    expect(ltcgDeduction(85_714_285, { table: "table2", holdYears: 3, resideYears: 2 }).value).toBe(17_142_857);
  });
});

describe("X7 주택 1년 이상 2년 미만 60% (Phase 3 재대조)", () => {
  it("과표 93,500,000 / 산출 56,100,000", () => {
    const r = computeCgt(base({ acquiredAt: "2025-03-01", acquisitionPrice: 600_000_000, transferPrice: 700_000_000, transferCost: 4_000_000 }));
    expect(r.gain.value).toBe(96_000_000);
    expect(r.taxBase.value).toBe(93_500_000);
    expect(r.tax.value).toBe(56_100_000);
  });
});
