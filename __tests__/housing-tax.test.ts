import { describe, expect, it } from "vitest";
import { computeHousing } from "@/lib/tax/housing-tax/engine";
import { DEFAULT_INPUT, validateInput, type HousingInput } from "@/lib/tax/housing-tax/input";
import { encodeHousing, decodeHousing } from "@/lib/tax/housing-tax/share";
import { HOUSING_RATES_VERSION } from "@/lib/tax/housing-tax/version";

const input = (changes: Partial<HousingInput> = {}): HousingInput => ({ ...DEFAULT_INPUT, ...changes });
describe("주택 세금 독립 손계산 fixture", () => {
  it("F1: 취득 6억 경계, 공시 3억 1주택", () => {
    const r = computeHousing(input({ purchasePrice: 600_000_000, homes: [{ publicValue: 300_000_000, urban: true }] }));
    expect(r.acquisition.tax.value).toBe(6_000_000);
    expect(r.acquisition.total.value).toBe(6_600_000);
    expect(r.properties[0].base.value).toBe(129_000_000);
    expect(r.properties[0].tax.value).toBe(99_000);
    expect(r.annual.value).toBe(299_400);
  });
  it("F2: 취득 7.5억 중간, 공시 6억, 취득 농특 과세", () => {
    const r = computeHousing(input({ purchasePrice: 750_000_000, ruralExempt: false, homes: [{ publicValue: 600_000_000, urban: true }] }));
    expect(r.acquisition.rate.value).toBe(.02);
    expect(r.acquisition.total.value).toBe(18_000_000);
    expect(r.properties[0].tax.value).toBe(348_000);
    expect(r.annual.value).toBe(787_200);
  });
  it("F3: 취득 9억, 공시 9억 특례 끝", () => {
    const r = computeHousing(input({ purchasePrice: 900_000_000, homes: [{ publicValue: 900_000_000, urban: true }] }));
    expect(r.acquisition.total.value).toBe(29_700_000);
    expect(r.properties[0].tax.value).toBe(787_500);
    expect(r.annual.value).toBe(1_512_000);
  });
  it("F4: 공시 15억 — 종부 재산세 중복공제까지", () => {
    const r = computeHousing(input({ homes: [{ publicValue: 1_500_000_000, urban: true }] }));
    expect(r.properties[0].tax.value).toBe(2_070_000);
    expect(r.comprehensive.base.value).toBe(180_000_000);
    expect(r.comprehensive.gross.value).toBe(900_000);
    expect(r.comprehensive.propertyCredit.value).toBe(92_000);
    expect(r.comprehensive.tax.value).toBe(808_000);
    expect(r.comprehensive.rural.value).toBe(161_600);
    expect(r.annual.value).toBe(4_398_600);
  });
  it("F5: 만70세·15년, 합계90%를80%로 제한", () => {
    const r = computeHousing(input({ age: 70, holdingYears: 15, homes: [{ publicValue: 1_500_000_000, urban: true }] }));
    expect(r.comprehensive.creditRate.value).toBe(.8);
    expect(r.comprehensive.personalCredit.value).toBe(646_400);
    expect(r.comprehensive.tax.value).toBe(161_600);
    expect(r.annual.value).toBe(3_622_920);
  });
  it("F6: 조정지역 2주택 중과 + 농특", () => {
    const r = computeHousing(input({ purchasePrice: 1_000_000_000, acquisitionHomes: 2, regulated: true, ruralExempt: false }));
    expect(r.acquisition.tax.value).toBe(80_000_000);
    expect(r.acquisition.education.value).toBe(4_000_000);
    expect(r.acquisition.rural.value).toBe(6_000_000);
    expect(r.acquisition.total.value).toBe(90_000_000);
  });
  it("F7: 조정지역 3주택 중과", () => {
    const r = computeHousing(input({ purchasePrice: 1_000_000_000, acquisitionHomes: 3, regulated: true, ruralExempt: false }));
    expect(r.acquisition.total.value).toBe(134_000_000);
  });
  it("F8: 일시적2주택은 일반세율(요건 사용자 확인)", () => {
    const r = computeHousing(input({ purchasePrice: 1_000_000_000, acquisitionHomes: 2, regulated: true, temporaryTwo: true, ruralExempt: false }));
    expect(r.acquisition.total.value).toBe(35_000_000);
    expect(r.review.join(" ")).toContain("일시적");
  });
  it("F9: 3주택 공시 합계27억 — 주택별 재산세와 종부 합산", () => {
    const r = computeHousing(input({ householdSingle: false, homes: Array.from({ length: 3 }, () => ({ publicValue: 900_000_000, urban: true })) }));
    expect(r.propertyTotal.value).toBe(7_776_000);
    expect(r.comprehensive.base.value).toBe(1_080_000_000);
    expect(r.comprehensive.gross.value).toBe(8_400_000);
    expect(r.comprehensive.propertyCredit.value).toBe(1_539_415);
    expect(r.annual.value).toBe(16_008_690);
  });
  it("F10: 과표12억 초과에서 2주택·3주택 종부세율 분리", () => {
    const two = computeHousing(input({ householdSingle: false, homes: Array.from({ length: 2 }, () => ({ publicValue: 1_800_000_000, urban: false })) }));
    const three = computeHousing(input({ householdSingle: false, homes: Array.from({ length: 3 }, () => ({ publicValue: 1_200_000_000, urban: false })) }));
    expect(two.comprehensive.gross.value).toBe(15_060_000);
    expect(three.comprehensive.gross.value).toBe(18_000_000);
  });
});
describe("경계값·입력·공유", () => {
  it("취득세율 소수점 넷째자리(%) 반올림", () => {
    const r = computeHousing(input({ purchasePrice: 700_000_000 }));
    expect(r.acquisition.rate.value).toBe(.016667);
    expect(r.acquisition.tax.value).toBe(11_666_900);
  });
  it("공시9억+1원은 특례세율 제외, 저율비율은 유지", () => {
    const r = computeHousing(input({ homes: [{ publicValue: 900_000_001, urban: false }] }));
    expect(r.properties[0].ratio.value).toBe(.45);
    expect(r.properties[0].tax.value).toBe(990_000);
  });
  it("12억·9억 공제 경계에서 종부세 0", () => {
    expect(computeHousing(input({ homes: [{ publicValue: 1_200_000_000, urban: false }] })).comprehensive.tax.value).toBe(0);
    expect(computeHousing(input({ householdSingle: false, homes: [{ publicValue: 900_000_000, urban: false }] })).comprehensive.tax.value).toBe(0);
  });
  it("다른 세대원이 주택 보유하면 1주택 특례·고령 공제 제외", () => {
    const r = computeHousing(input({ householdSingle: false, age: 80, holdingYears: 20 }));
    expect(r.properties[0].ratio.value).toBe(.6);
    expect(r.comprehensive.deduction.value).toBe(900_000_000);
    expect(r.comprehensive.creditRate.value).toBe(0);
  });
  it.each([[59,4,0],[60,5,.4],[65,10,.7],[70,15,.8]])("나이%s·보유%s년 공제율", (age,holdingYears,rate) => {
    expect(computeHousing(input({ age,holdingYears })).comprehensive.creditRate.value).toBeCloseTo(rate);
  });
  it("도시지역분 제외·취득없음·기준일 보유없음", () => {
    expect(computeHousing(input({ homes: [{ publicValue: 300_000_000, urban: false }] })).annual.value).toBe(118_800);
    const r = computeHousing(input({ purchasePrice: 0, householdSingle: false, homes: [] }));
    expect(r.annual.value).toBe(0);
    expect(r.acquisition.total.value).toBe(0);
  });
  it("비조정 2주택 일반·3주택8%·4주택12%", () => {
    for (const [acquisitionHomes, rate] of [[2,.02],[3,.08],[4,.12]]) {
      expect(computeHousing(input({ acquisitionHomes })).acquisition.rate.value).toBe(rate);
    }
  });
  it.each([null, {}, input({ purchasePrice: -1 }), input({ age: NaN }), input({ holdingYears: 1.5 }), input({ homes: [{ publicValue: Infinity, urban: true }] }), input({ homes: [], householdSingle: true }), input({ acquisitionHomes: 3, temporaryTwo: true }), input({ homes: Array.from({length:11},()=>({publicValue:1,urban:false})) })])("잘못된 입력 거부 %#", raw => {
    expect(validateInput(raw).length).toBeGreaterThan(0);
    expect(() => computeHousing(raw as HousingInput)).toThrow();
  });
  it("공유 복원 검증·세율 버전 차이 안내", () => {
    const encoded = encodeHousing(DEFAULT_INPUT);
    expect(decodeHousing(encoded)).toEqual({ ok: true, input: DEFAULT_INPUT, ratesChanged: false });
    const raw = JSON.parse(atob(encoded.replace(/-/g,"+").replace(/_/g,"/")));
    raw.r = "old";
    expect(decodeHousing(btoa(JSON.stringify(raw)))).toMatchObject({ok:true,ratesChanged:true});
    raw.r = HOUSING_RATES_VERSION; raw.d.age = -1;
    expect(decodeHousing(btoa(JSON.stringify(raw))).ok).toBe(false);
    expect(decodeHousing("broken").ok).toBe(false);
    expect(decodeHousing("x".repeat(12001)).ok).toBe(false);
  });
  it("모든 결과 숫자에 계산 과정·사람용 근거가 있음", () => {
    const visit = (v: unknown): void => {
      if (!v || typeof v !== "object") return;
      if ("value" in v) {
        const t = v as {value:number;steps:string[];basis:{url?:string}[]};
        expect(Number.isFinite(t.value)).toBe(true);
        expect(t.steps.length).toBeGreaterThan(0);
        expect(t.basis.length).toBeGreaterThan(0);
        for (const b of t.basis) if (b.url) expect(b.url).not.toMatch(/OC=|DRF/);
      } else Object.values(v).forEach(visit);
    };
    visit(computeHousing(DEFAULT_INPUT));
  });
});
