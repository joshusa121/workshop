/**
 * 손계산 fixture 고정 — docs/verified/cgt-hand-calc-fixtures.md F1~F10 (F5는 Josh 감수 후 추가)
 */
import { describe, expect, it } from "vitest";
import { computeCgt } from "../src/lib/tax/cgt/cgt";
import type { CgtInput, OtherHolding } from "../src/lib/tax/cgt/input";

function house(over: Partial<CgtInput["subject"]> = {}, household: Partial<CgtInput["household"]> = {}, extra: Partial<CgtInput> = {}): CgtInput {
  return {
    subject: {
      kind: "house",
      acquiredAt: "2018-05-10",
      transferredAt: "2026-09-01",
      acquisitionPrice: 600_000_000,
      transferPrice: 1_000_000_000,
      capitalExpenditure: 0,
      transferCost: 0,
      residenceMonths: 0,
      adjustedAtAcquisition: false,
      adjustedAtTransfer: false,
      registered: true,
      ...over,
    },
    household: { others: [], special: { type: "none" }, ...household },
    ...extra,
  };
}

describe("F1 1세대 1주택 비과세 (10억)", () => {
  const r = computeCgt(house());
  it("비과세, 세액 0", () => {
    expect(r.status.treatedAsOneHouse).toBe(true);
    expect(r.exemption.exempt).toBe(true);
    expect(r.exemption.fullyExempt).toBe(true);
    expect(r.tax.value).toBe(0);
    expect(r.localTax.value).toBe(0);
    expect(r.total.value).toBe(0);
  });
});

describe("F2 1세대 1주택 고가 20억, 보유 10년·거주 10년", () => {
  const r = computeCgt(
    house({
      acquiredAt: "2016-03-02",
      acquisitionPrice: 1_000_000_000,
      transferPrice: 2_000_000_000,
      capitalExpenditure: 10_000_000,
      transferCost: 10_000_000,
      residenceMonths: 125,
    }),
  );
  it("단계별 값", () => {
    expect(r.exemption.exempt).toBe(true);
    expect(r.exemption.fullyExempt).toBe(false);
    expect(r.gain.value).toBe(980_000_000);
    expect(r.taxableGain.value).toBe(392_000_000);
    expect(r.ltcg.value).toBe(313_600_000);
    expect(r.incomeAmount.value).toBe(78_400_000);
    expect(r.taxBase.value).toBe(75_900_000);
    expect(r.tax.value).toBe(12_456_000);
    expect(r.localTax.value).toBe(1_245_600);
    expect(r.total.value).toBe(13_701_600);
    expect(r.ltcgTable).toBe("table2");
  });
  it("근거에 §160·§95·§104 조문이 달린다", () => {
    expect(r.taxableGain.basis.map((b) => (b.kind === "law" ? b.article : "")).join()).toContain("제160조");
    expect(r.ltcg.basis.map((b) => (b.kind === "law" ? b.article : "")).join()).toContain("제95조");
    expect(r.tax.basis.map((b) => (b.kind === "law" ? b.article : "")).join()).toContain("제55조");
  });
});

describe("F3 일시적 2주택 기한 내 → 비과세", () => {
  const r = computeCgt(
    house(
      { acquiredAt: "2020-01-15", acquisitionPrice: 500_000_000, transferPrice: 900_000_000, transferredAt: "2026-04-30" },
      { others: [{ kind: "house", acquiredAt: "2023-06-01" }], special: { type: "temporary" } },
    ),
  );
  it("비과세", () => {
    expect(r.status.category).toBe("temporary_two");
    expect(r.exemption.exempt).toBe(true);
    expect(r.total.value).toBe(0);
  });
});

describe("F4 일시적 2주택 기한 도과 → 과세 (비조정, 표1 12%)", () => {
  const r = computeCgt(
    house(
      { acquiredAt: "2020-01-15", acquisitionPrice: 500_000_000, transferPrice: 900_000_000, transferredAt: "2026-09-01" },
      { others: [{ kind: "house", acquiredAt: "2023-06-01" }], special: { type: "temporary" } },
    ),
  );
  it("판정·세액", () => {
    expect(r.status.category).toBe("multi");
    expect(r.exemption.exempt).toBe(false);
    expect(r.gain.value).toBe(400_000_000);
    expect(r.ltcg.value).toBe(48_000_000);
    expect(r.ltcgTable).toBe("table1");
    expect(r.taxBase.value).toBe(349_500_000);
    expect(r.tax.value).toBe(113_860_000);
    expect(r.localTax.value).toBe(11_386_000);
    expect(r.total.value).toBe(125_246_000);
    expect(r.status.reasons.join(" ")).toContain("3년");
  });
});

describe("F6 1주택 보유 1년 미만 → 70%", () => {
  const r = computeCgt(
    house({ acquiredAt: "2026-01-10", acquisitionPrice: 500_000_000, transferPrice: 550_000_000, transferCost: 5_000_000 }),
  );
  it("단기세율이 기본세율보다 커서 선택", () => {
    expect(r.exemption.exempt).toBe(false);
    expect(r.taxBase.value).toBe(42_500_000);
    expect(r.tax.value).toBe(29_750_000);
    expect(r.rateLabel).toContain("70%");
    expect(r.localTax.value).toBe(2_975_000);
    expect(r.total.value).toBe(32_725_000);
  });
});

describe("F7 분양권 (1년 이상 → 60%)", () => {
  const r = computeCgt(
    house({ kind: "presale", acquiredAt: "2024-02-01", acquisitionPrice: 300_000_000, transferPrice: 350_000_000, transferCost: 2_000_000 }),
  );
  it("장특 없음, 60%", () => {
    expect(r.exemption.exempt).toBe(false);
    expect(r.ltcg.value).toBe(0);
    expect(r.taxBase.value).toBe(45_500_000);
    expect(r.tax.value).toBe(27_300_000);
    expect(r.localTax.value).toBe(2_730_000);
    expect(r.total.value).toBe(30_030_000);
  });
});

describe("F8 원조합원 입주권 양도, 청산금 수령 1억", () => {
  const r = computeCgt(
    house(
      {
        kind: "right",
        acquiredAt: "2012-04-01",
        acquisitionPrice: 300_000_000,
        transferPrice: 900_000_000,
        transferCost: 5_000_000,
      },
      { others: [{ kind: "house", acquiredAt: "2020-03-01" }], special: { type: "none" } },
      {
        redevelopment: {
          role: "original",
          approvalDate: "2022-06-01",
          appraisal: 700_000_000,
          settlement: { type: "received", amount: 100_000_000 },
          transferAsNewHouse: false,
        },
      },
    ),
  );
  it("2분법 양도차익과 장특(관리처분 전 분만)", () => {
    expect(r.exemption.exempt).toBe(false);
    expect(r.redevelopment?.afterApproval.value).toBe(295_000_000);
    expect(r.redevelopment?.beforeApproval.value).toBe(342_857_142);
    expect(r.ltcg.value).toBe(68_571_428);
    expect(r.incomeAmount.value).toBe(569_285_714);
    expect(r.taxBase.value).toBe(566_785_714);
    expect(r.tax.value).toBe(202_109_990);
    expect(r.localTax.value).toBe(20_210_990);
    expect(r.total.value).toBe(222_320_980);
  });
});

describe("F9 거주 2년 미만 → 표1 (고가 15억)", () => {
  const r = computeCgt(
    house({ acquiredAt: "2014-01-01", acquisitionPrice: 500_000_000, transferPrice: 1_500_000_000, residenceMonths: 12 }),
  );
  it("표1 24%", () => {
    expect(r.ltcgTable).toBe("table1");
    expect(r.taxableGain.value).toBe(200_000_000);
    expect(r.ltcg.value).toBe(48_000_000);
    expect(r.tax.value).toBe(36_885_000);
    expect(r.localTax.value).toBe(3_688_500);
  });
});

describe("F10 표2 거주 정확히 2년 (8%)", () => {
  const r = computeCgt(
    house({ acquiredAt: "2023-01-10", acquisitionPrice: 800_000_000, transferPrice: 1_400_000_000, residenceMonths: 24 }),
  );
  it("보유 3년 12% + 거주 2년 8%", () => {
    expect(r.ltcgTable).toBe("table2");
    expect(r.taxableGain.value).toBe(85_714_285);
    expect(r.ltcg.value).toBe(17_142_857);
    expect(r.tax.value).toBe(10_097_140);
    expect(r.localTax.value).toBe(1_009_710);
  });
});

describe("경계·극단값", () => {
  it("양도차손이면 세액 0, 음수 과표 0", () => {
    const r = computeCgt(house({ acquiredAt: "2025-01-01", acquisitionPrice: 800_000_000, transferPrice: 700_000_000 }));
    expect(r.gain.value).toBe(-100_000_000);
    expect(r.taxBase.value).toBe(0);
    expect(r.total.value).toBe(0);
  });
  it("미등기: 70%, 장특·기본공제 없음, 비과세 없음", () => {
    const r = computeCgt(house({ acquiredAt: "2015-01-01", registered: false }));
    expect(r.exemption.exempt).toBe(false);
    expect(r.ltcg.value).toBe(0);
    expect(r.basicDeduction.value).toBe(0);
    expect(r.tax.value).toBe(280_000_000);
  });
  it("조정지역 취득 + 거주 2년 미만이면 1주택이어도 과세", () => {
    const r = computeCgt(house({ adjustedAtAcquisition: true, residenceMonths: 23 }));
    expect(r.exemption.exempt).toBe(false);
    expect(r.exemption.reasons.join(" ")).toContain("거주");
  });
  it("100억 주택", () => {
    const r = computeCgt(house({ acquiredAt: "2000-01-01", acquisitionPrice: 1_000_000_000, transferPrice: 10_000_000_000, residenceMonths: 300 }));
    expect(r.taxableGain.value).toBe(7_920_000_000);
    expect(r.ltcg.value).toBe(6_336_000_000);
    expect(r.taxBase.value).toBe(1_581_500_000);
    expect(r.tax.value).toBe(645_735_000);
  });
});

// ── F5 다주택 중과 (Josh 승인 2026-09-26: 유예 2026-05-09 만료, 경과조치 나·다목) ──
function twoHouse(transferredAt: string, extra: Partial<CgtInput> = {}, others: OtherHolding[] = [{ kind: "house", acquiredAt: "2023-06-01" }]) {
  return house(
    { acquiredAt: "2020-01-15", acquisitionPrice: 500_000_000, transferPrice: 900_000_000, transferredAt, adjustedAtTransfer: true },
    { others, special: { type: "none" } },
    extra,
  );
}

describe("F5(a) 조정지역 2주택, 유예 만료 후 양도 → 중과 +20%p, 장특 배제", () => {
  const r = computeCgt(twoHouse("2026-09-01"));
  it("홈택스 대조값과 같다", () => {
    expect(r.surcharge.applies).toBe(true);
    expect(r.ltcg.value).toBe(0);
    expect(r.taxBase.value).toBe(397_500_000);
    expect(r.tax.value).toBe(212_560_000);
    expect(r.localTax.value).toBe(21_256_000);
    expect(r.total.value).toBe(233_816_000);
    expect(r.surcharge.reasons.join(" ")).toContain("2026-05-09");
  });
});

describe("F5(b) 유예 기간 내 양도(2026-04-30) → 일반세율 + 표1", () => {
  const r = computeCgt(twoHouse("2026-04-30"));
  it("중과 없음", () => {
    expect(r.surcharge.applies).toBe(false);
    expect(r.ltcg.value).toBe(48_000_000);
    expect(r.tax.value).toBe(113_860_000);
    expect(r.localTax.value).toBe(11_386_000);
  });
});

describe("F5(c) 3주택 이상 → +30%p", () => {
  const r = computeCgt(twoHouse("2026-09-01", {}, [
    { kind: "house", acquiredAt: "2023-06-01" },
    { kind: "presale", acquiredAt: "2022-03-01" },
  ]));
  it("손계산 252,310,000", () => {
    expect(r.surcharge.level).toBe("three");
    expect(r.tax.value).toBe(252_310_000);
    expect(r.localTax.value).toBe(25_231_000);
  });
});

describe("F5(d) 지방 저가 주택은 주택 수에서 빠져 중과 없음", () => {
  const r = computeCgt(twoHouse("2026-09-01", {}, [{ kind: "house", acquiredAt: "2023-06-01", nonMetroLowValue: true }]));
  it("일반세율 + 표1", () => {
    expect(r.surcharge.applies).toBe(false);
    expect(r.tax.value).toBe(113_860_000);
  });
});

describe("F5(e) 다목 경과조치 (계약 2026-05-01, 4개월)", () => {
  const tr = { contractDate: "2026-05-01", landPermit: false, sixMonthRegion: false };
  it("2026-08-31 양도 → 유예", () => {
    const r = computeCgt(twoHouse("2026-08-31", { transitional: tr }));
    expect(r.surcharge.applies).toBe(false);
    expect(r.surcharge.reasons.join(" ")).toContain("다목");
  });
  it("2026-09-01 양도 → 중과", () => {
    expect(computeCgt(twoHouse("2026-09-01", { transitional: tr })).surcharge.applies).toBe(true);
  });
  it("계약이 2026-05-10이면 다목 불가", () => {
    expect(computeCgt(twoHouse("2026-06-01", { transitional: { ...tr, contractDate: "2026-05-10" } })).surcharge.applies).toBe(true);
  });
});

describe("F5(f) 나목 경과조치 (허가 신청 2026-05-08, 계약 2026-06-01, 6개월 지역)", () => {
  const tr = { contractDate: "2026-06-01", landPermit: true, permitAppliedAt: "2026-05-08", sixMonthRegion: true };
  it("2026-11-09 양도 → 유예", () => {
    expect(computeCgt(twoHouse("2026-11-09", { transitional: tr })).surcharge.applies).toBe(false);
  });
  it("2026-11-10 양도 → 중과", () => {
    expect(computeCgt(twoHouse("2026-11-10", { transitional: tr })).surcharge.applies).toBe(true);
  });
  it("허가 신청이 2026-05-10이면 불가", () => {
    expect(computeCgt(twoHouse("2026-09-01", { transitional: { ...tr, permitAppliedAt: "2026-05-10" } })).surcharge.applies).toBe(true);
  });
});

describe("F5(g) 조정지역 2주택 + 보유 1년 → 60%와 중과 중 큰 세액", () => {
  const r = computeCgt(
    house(
      { acquiredAt: "2025-06-01", acquisitionPrice: 800_000_000, transferPrice: 900_000_000, adjustedAtTransfer: true },
      { others: [{ kind: "house", acquiredAt: "2023-06-01" }], special: { type: "none" } },
    ),
  );
  it("60% 58,500,000 > 중과 38,185,000", () => {
    expect(r.surcharge.applies).toBe(true);
    expect(r.taxBase.value).toBe(97_500_000);
    expect(r.tax.value).toBe(58_500_000);
    expect(r.tax.steps.join(" ")).toContain("38,185,000");
  });
});

describe("기한 초일산입 (Josh 확정 2026-09-26) — 확인 권장 문구", () => {
  it("일시적 2주택 판정은 deadlineRuleUsed", () => {
    const r = computeCgt(house({ acquiredAt: "2020-01-15", transferredAt: "2026-04-30" }, { others: [{ kind: "house", acquiredAt: "2023-06-01" }], special: { type: "temporary" } }));
    expect(r.deadlineRuleUsed).toBe(true);
    expect(r.notes.join(" ")).toContain("마지막 날 계산은 세무사 확인을 권장");
  });
  it("경과조치 판정은 deadlineRuleUsed", () => {
    const r = computeCgt(twoHouse("2026-08-31", { transitional: { contractDate: "2026-05-01", landPermit: false, sixMonthRegion: false } }));
    expect(r.deadlineRuleUsed).toBe(true);
  });
  it("단순 1주택·유예 기간 내 양도는 false", () => {
    expect(computeCgt(house()).deadlineRuleUsed).toBe(false);
    expect(computeCgt(house()).notes.join(" ")).not.toContain("마지막 날 계산");
    expect(computeCgt(twoHouse("2026-04-30")).deadlineRuleUsed).toBe(false);
  });
});

describe("근거 팝오버 — 계산표의 모든 숫자에 근거 조문이 있다", () => {
  const cases: CgtInput[] = [
    house(),
    house({ acquiredAt: "2016-03-02", acquisitionPrice: 1_000_000_000, transferPrice: 2_000_000_000, residenceMonths: 125 }),
    twoHouse("2026-09-01"),
    house({ kind: "presale", acquiredAt: "2024-02-01", acquisitionPrice: 300_000_000, transferPrice: 350_000_000 }),
  ];
  it("gain·taxableGain·ltcg·incomeAmount·basicDeduction·taxBase·tax·localTax·total", () => {
    for (const c of cases) {
      const r = computeCgt(c);
      for (const [k, t] of Object.entries({ gain: r.gain, taxableGain: r.taxableGain, ltcg: r.ltcg, incomeAmount: r.incomeAmount, basicDeduction: r.basicDeduction, taxBase: r.taxBase, tax: r.tax, localTax: r.localTax, total: r.total })) {
        expect(t.basis.length, `${k} 근거 없음`).toBeGreaterThan(0);
      }
    }
  });
});
