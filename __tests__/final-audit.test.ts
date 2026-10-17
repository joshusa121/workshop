/**
 * 1화 법인전환 시뮬레이터 — Phase 3 최종 감사 (2026-09-26)
 * 기대값은 엔진 코드를 쓰지 않은 독립 Python 손계산(docs/verified/final-audit.md §2 스크립트)과
 * 공식 계산기 실측(4대사회보험 정보연계센터·홈택스, 같은 문서 §3)에서 왔다.
 */
import { describe, expect, it } from "vitest";
import { EMPTY_SCENARIO } from "../src/lib/default-scenario";
import { decodeScenario } from "../src/lib/share-codec";
import { DEFAULT_ASSUMPTIONS, resolveAssumptions } from "../src/lib/tax/assumptions";
import {
  acquisitionTax,
  acquisitionTaxAfterRelief,
  registrationTax,
  registrationTaxWithEducation,
} from "../src/lib/tax/conversion/cost";
import { earnedIncomeAmount, earnedIncomeDeduction, earnedIncomeTaxCredit, selfBasicDeduction, standardTaxCredit } from "../src/lib/tax/deductions";
import { computeIncomeTax } from "../src/lib/tax/income-tax";
import { employeeInsurance, extraIncomeInsurance } from "../src/lib/tax/insurance";
import { explainCompare } from "../src/lib/tax/explain";
import { corpDistributableCash, runCorporate, runIndividual } from "../src/lib/tax/scenario";
import type { ScenarioInput } from "../src/lib/tax/scenario-input";

/** ① 이익 1.5억 · 가족 1명 3,600만 · 배당 1천만 · 노란우산 ON(납입 미입력 → 한도 가득) · 부산 */
const A1: ScenarioInput = {
  ...EMPTY_SCENARIO,
  revenue: 400_000_000,
  accountingProfit: 150_000_000,
  workplace: { sido: "부산광역시" },
  assets: { total: 100_000_000, realEstate: 0, housing: 0 },
  ownerSalary: 72_000_000,
  dividendAmount: 10_000_000,
  familyWorkers: 1,
  yellowUmbrellaEnabled: true,
};

/** ② 이익 3억 · 서비스 매출 8억(성실신고 대상) · 정관 3배 · 창업감면 50% 잔여 2년 · 배당 2천만 */
const A2: ScenarioInput = {
  ...EMPTY_SCENARIO,
  revenue: 800_000_000,
  accountingProfit: 300_000_000,
  workplace: { sido: "부산광역시" },
  assets: { total: 100_000_000, realEstate: 0, housing: 0 },
  ownerSalary: 72_000_000,
  dividendAmount: 20_000_000,
  retirementPlan: true,
  retirementMultiple: 3,
  startupReliefRate: 0.5,
  startupReliefYearsLeft: 2,
};

/** ③ 이익 6억 · 서울(과밀) · 부동산 5억 · 부채 1억 · 자본금 5천만 · 배당 3천만(건보 절벽 초과) · 도소매 매출 14억(비대상) */
const A3: ScenarioInput = {
  ...EMPTY_SCENARIO,
  industryGroup: "농림어업광업도소매",
  revenue: 1_400_000_000,
  accountingProfit: 600_000_000,
  workplace: { sido: "서울특별시" },
  assets: { total: 700_000_000, realEstate: 500_000_000, housing: 0 },
  liabilities: 100_000_000,
  ownerSalary: 72_000_000,
  dividendAmount: 30_000_000,
};

describe("독립 손계산 A1 — 이익 1.5억·가족 1명·배당 1천만·노란우산", () => {
  const ind = runIndividual(A1, DEFAULT_ASSUMPTIONS);
  const corp = runCorporate(A1, DEFAULT_ASSUMPTIONS);
  it("개인: 과표 126,910,600 → 산출 28,978,710 → 손에 남는 돈 97,111,020", () => {
    expect(ind.ownerDisposable.value).toBe(97_111_020);
    expect(ind.totalBurden.value).toBe(52_888_980);
  });
  it("법인: 과표 32,477,208 → 유보 16,504,718 / 대표 67,728,892 / 합산 84,233,610", () => {
    expect(corp.corpRetained.value).toBe(16_504_718);
    expect(corp.ownerDisposable.value).toBe(67_728_892);
    expect(corp.combinedNetWorth.value).toBe(84_233_610);
  });
  it("가족 1명: 세부담 4,269,154 / 실수령 31,730,846 / 토글 합산 115,964,456", () => {
    expect(corp.familyBurden.value).toBe(4_269_154);
    expect(corp.familyDisposable.value).toBe(31_730_846);
    expect(corp.combinedNetWorthWithFamily.value).toBe(115_964_456);
  });
});

describe("독립 손계산 A2 — 이익 3억·성실신고·정관 3배·창업감면 50%", () => {
  const ind = runIndividual(A2, DEFAULT_ASSUMPTIONS);
  const corp = runCorporate(A2, DEFAULT_ASSUMPTIONS);
  it("개인: 산출 80,649,190 − 감면 40,324,590 − 표준 7만 − 성실 90만 → 손에 남는 돈 221,918,340", () => {
    expect(ind.ownerDisposable.value).toBe(221_918_340);
  });
  it("법인: 과표 221,651,472 → 유보 171,888,162 / 대표 76,188,892 / 합산 248,077,054", () => {
    expect(corp.corpRetained.value).toBe(171_888_162);
    expect(corp.ownerDisposable.value).toBe(76_188_892);
    expect(corp.combinedNetWorth.value).toBe(248_077_054);
  });
  it("정관 3배: 비용 인정 증가 27,888,162 / 법인세·지방세 감소 5,449,350", () => {
    expect(corp.retirementDetail?.deductibleIncrease.value).toBe(27_888_162);
    expect(corp.retirementDetail?.corpTaxSaving.value).toBe(5_449_350);
  });
});

describe("독립 손계산 A3 — 이익 6억·서울 부동산 5억·배당 3천만", () => {
  const ind = runIndividual(A3, DEFAULT_ASSUMPTIONS);
  const corp = runCorporate(A3, DEFAULT_ASSUMPTIONS);
  it("개인: 과표 540,304,000 → 산출 190,987,680 → 손에 남는 돈 332,294,560", () => {
    expect(ind.ownerDisposable.value).toBe(332_294_560);
  });
  it("법인: 과표 521,651,472 → 유보 396,488,162 / 대표 83,571,424(비교과세·배당공제 100만·건보 813,468) / 합산 480,059,586", () => {
    expect(corp.corpRetained.value).toBe(396_488_162);
    expect(corp.ownerDisposable.value).toBe(83_571_424);
    expect(corp.combinedNetWorth.value).toBe(480_059_586);
    expect(extraIncomeInsurance(30_000_000).value).toBe(813_468);
  });
  it("전환 비용: 등록면허세 600,000 + 교육세 = 720,000 / 취득세 40,000,000 → 감면 후 20,000,000", () => {
    expect(registrationTax(A3).value).toBe(600_000);
    expect(registrationTaxWithEducation(A3).value).toBe(720_000);
    expect(acquisitionTax(A3).value).toBe(40_000_000);
    expect(acquisitionTaxAfterRelief(A3).value).toBe(20_000_000);
  });
});

describe("공식 계산기 재대조 (2026-09-26 Aside 실측)", () => {
  it("4insure 월 300만(가족): 연금 142,500 / 건보 107,850 / 요양 14,170 (요양은 공단 월 10원 절사)", () => {
    const e = employeeInsurance(36_000_000);
    expect(e.npsEmployee.value / 12).toBe(142_500);
    expect(e.nhisEmployee.value / 12).toBe(107_850);
    expect(Math.abs(e.ltcEmployee.value / 12 - 14_170)).toBeLessThanOrEqual(10);
  });
  it("4insure 월 600만(대표): 연금 285,000 / 건보 215,700 / 요양 28,340", () => {
    const e = employeeInsurance(72_000_000);
    expect(e.npsEmployee.value / 12).toBe(285_000);
    expect(e.nhisEmployee.value / 12).toBe(215_700);
    expect(Math.abs(e.ltcEmployee.value / 12 - 28_340)).toBeLessThanOrEqual(10);
  });
  it("홈택스 근로소득 세액비교(2025 귀속) 총급여 7,200만: 공제 13,350,000 / 과표 57,150,000 / 산출 7,956,000 / 결정 7,326,000 / 지방 732,600", () => {
    const salary = 72_000_000;
    expect(earnedIncomeDeduction(salary).value).toBe(13_350_000);
    const earned = earnedIncomeAmount(salary).value;
    expect(earned).toBe(58_650_000);
    const base = earned - selfBasicDeduction().value;
    expect(base).toBe(57_150_000);
    const tax = computeIncomeTax(earned, 0, selfBasicDeduction().value);
    expect(tax.taxBase.value).toBe(57_150_000);
    expect(tax.incomeTax.value).toBe(7_956_000);
    const determined = tax.incomeTax.value - earnedIncomeTaxCredit(tax.incomeTax.value, salary).value - standardTaxCredit(true).value;
    expect(determined).toBe(7_326_000);
    expect(Math.floor((determined * 0.1) / 10) * 10).toBe(732_600);
  });
});

/** 감사 발견 버그 회귀 테스트 (final-audit.md §5). 기대값은 §2 손계산 스크립트와 같은 방식으로 계산 */
describe("발견 버그 회귀 (final-audit.md §5)", () => {
  it("B1 법인 결손 유지: 이익 3천만·급여 7,200만 → 법인 현금 −50,748,528 (30,000,000 − 72,000,000 − 사용자 보험 6,348,528 − 기장 2,400,000)", () => {
    const i: ScenarioInput = { ...EMPTY_SCENARIO, revenue: 100_000_000, accountingProfit: 30_000_000, ownerSalary: 72_000_000, dividendAmount: 0 };
    const c = runCorporate(i, DEFAULT_ASSUMPTIONS);
    expect(c.corpRetained.value).toBe(-50_748_528);
    expect(corpDistributableCash(i, DEFAULT_ASSUMPTIONS)).toBe(-50_748_528);
    expect(c.corpRetained.steps.join(" ")).toContain("적자는 다음 해로 넘겨 공제하지 않은 것으로 봅니다");
  });
  it("B1 FAM-b 갱신: 이익 8천만·급여 4,800만·가족 1명 → 유보 −13,806,616 / 합산 27,246,632 / 가족 포함 58,977,478", () => {
    const i: ScenarioInput = {
      ...EMPTY_SCENARIO,
      revenue: 300_000_000,
      accountingProfit: 80_000_000,
      ownerSalary: 48_000_000,
      dividendAmount: 11_156_609,
      familyWorkers: 1,
      yellowUmbrellaEnabled: false,
    };
    const c = runCorporate(i, DEFAULT_ASSUMPTIONS);
    expect(c.corpRetained.value).toBe(-13_806_616);
    expect(c.ownerDisposable.value).toBe(41_053_248);
    expect(c.combinedNetWorth.value).toBe(27_246_632);
    expect(c.combinedNetWorthWithFamily.value).toBe(58_977_478);
  });
  it("B1 음수 이익 −5천만: 결론 문장에 「법인이 … 앞섭니다」가 나오지 않는다", () => {
    const i: ScenarioInput = { ...EMPTY_SCENARIO, revenue: 100_000_000, accountingProfit: -50_000_000, ownerSalary: 0 };
    const lines = explainCompare(runIndividual(i, DEFAULT_ASSUMPTIONS), runCorporate(i, DEFAULT_ASSUMPTIONS));
    for (const line of lines) expect(line).not.toMatch(/법인이 ([\d,]+원 )?앞섭니다/);
    expect(runCorporate(i, DEFAULT_ASSUMPTIONS).combinedNetWorth.value).toBeLessThan(runIndividual(i, DEFAULT_ASSUMPTIONS).combinedNetWorth.value);
  });
  it("B2 공유 URL overrides: 문자열·음수·NaN·모르는 키는 버리고 유한한 0 이상 숫자만 받는다", () => {
    const payload = {
      v: 3,
      r: "2026-4",
      d: { ...EMPTY_SCENARIO, accountingProfit: 100_000_000, ownerSalary: 50_000_000, overrides: { bookkeepingMonthlyCorp: "abc", bookkeepingAdjustmentCorp: -1, appraisalCost: null, retirementServiceYears: 15, sincereConfirmCost: 0, hacked: 5 } },
    };
    const d = decodeScenario(Buffer.from(JSON.stringify(payload)).toString("base64url"));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.input.overrides).toEqual({ retirementServiceYears: 15, sincereConfirmCost: 0 });
    const v = runCorporate(d.input, resolveAssumptions(d.input.overrides)).combinedNetWorth.value;
    expect(Number.isFinite(v)).toBe(true);
  });
  it("B2 overrides가 객체가 아니거나 남는 키가 없으면 undefined", () => {
    const enc = (o: unknown) => Buffer.from(JSON.stringify({ v: 3, r: "2026-4", d: { ...EMPTY_SCENARIO, overrides: o } })).toString("base64url");
    for (const o of [{ bookkeepingMonthlyCorp: "x" }, "abc", 5]) {
      const d = decodeScenario(enc(o));
      expect(d.ok && d.input.overrides).toBeUndefined();
    }
  });
  it("B8 v1 배당성향 마이그레이션은 원 단위 정수", () => {
    const v1 = { v: 1, r: "2026-1", d: { ...EMPTY_SCENARIO, accountingProfit: 80_000_000, ownerSalary: 48_000_000, dividendPayoutRatio: 1 / 3 } };
    const d = decodeScenario(Buffer.from(JSON.stringify(v1)).toString("base64url"));
    expect(d.ok && Number.isInteger(d.input.dividendAmount)).toBe(true);
  });
});
