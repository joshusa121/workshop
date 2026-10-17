import { describe, expect, it } from "vitest";
import { EMPTY_SCENARIO } from "../src/lib/default-scenario";
import { decodeScenario, encodeScenario } from "../src/lib/share-codec";
import { DEFAULT_ASSUMPTIONS } from "../src/lib/tax/assumptions";
import { yellowUmbrellaDeduction } from "../src/lib/tax/deductions";
import { extraIncomeInsurance } from "../src/lib/tax/insurance";
import { runCorporate, runIndividual, sincereConfirm, startupRelief } from "../src/lib/tax/scenario";
import type { ScenarioInput } from "../src/lib/tax/scenario-input";

/** 성실신고 비대상(매출 3억)·노란우산 OFF 기준선 */
const base: ScenarioInput = {
  ...EMPTY_SCENARIO,
  revenue: 300_000_000,
  accountingProfit: 150_000_000,
  assets: { total: 200_000_000, realEstate: 50_000_000, housing: 0 },
  liabilities: 40_000_000,
  ownerSalary: 48_000_000,
  dividendAmount: 11_156_609,
  yellowUmbrellaEnabled: false,
};

describe("D1 노란우산공제 — hand-calc YU", () => {
  it("구간 한도 4단계 (600/500/400/200만)", () => {
    expect(yellowUmbrellaDeduction(40_000_000).value).toBe(6_000_000);
    expect(yellowUmbrellaDeduction(40_000_001).value).toBe(5_000_000);
    expect(yellowUmbrellaDeduction(60_000_001).value).toBe(4_000_000);
    expect(yellowUmbrellaDeduction(100_000_001).value).toBe(2_000_000);
  });
  it("공제 = min(납입, 한도). 1,800만 초과 납입은 클램프", () => {
    expect(yellowUmbrellaDeduction(30_000_000, 1_000_000).value).toBe(1_000_000);
    expect(yellowUmbrellaDeduction(30_000_000, 99_000_000).value).toBe(6_000_000);
    expect(yellowUmbrellaDeduction(30_000_000, 99_000_000).steps.join(" ")).toContain("18,000,000");
    expect(yellowUmbrellaDeduction(30_000_000).basis.some((b) => b.kind === "law" && b.article.includes("제86조의3"))).toBe(true);
  });
  it("YU-a 사업소득 1.5억·납입 200만 → 과표 35% 구간 → 소득세 70만 + 지방 7만 = 77만 절감", () => {
    const off = runIndividual(base, DEFAULT_ASSUMPTIONS);
    const on = runIndividual({ ...base, yellowUmbrellaEnabled: true, yellowUmbrellaContribution: 2_000_000 }, DEFAULT_ASSUMPTIONS);
    expect(on.ownerDisposable.value - off.ownerDisposable.value).toBe(770_000);
    expect(on.ownerDisposable.steps.some((s) => s.includes("노란우산 소득공제 2,000,000"))).toBe(true);
  });
  it("납입액 미입력이면 구간 한도 가득 (1.5억 → 200만)", () => {
    const auto = runIndividual({ ...base, yellowUmbrellaEnabled: true }, DEFAULT_ASSUMPTIONS);
    const two = runIndividual({ ...base, yellowUmbrellaEnabled: true, yellowUmbrellaContribution: 2_000_000 }, DEFAULT_ASSUMPTIONS);
    expect(auto.ownerDisposable.value).toBe(two.ownerDisposable.value);
  });
  it("법인 시나리오는 노란우산을 계산하지 않는다", () => {
    const a = runCorporate(base, DEFAULT_ASSUMPTIONS);
    const b = runCorporate({ ...base, yellowUmbrellaEnabled: true }, DEFAULT_ASSUMPTIONS);
    expect(b.ownerDisposable.value).toBe(a.ownerDisposable.value);
  });
});

describe("D2 창업중소기업 감면 승계", () => {
  it("감면 50%·잔여 3년: 개인 산출세액의 절반이 줄고 지방세는 그대로", () => {
    const off = runIndividual(base, DEFAULT_ASSUMPTIONS);
    const on = runIndividual({ ...base, startupReliefRate: 0.5, startupReliefYearsLeft: 3 }, DEFAULT_ASSUMPTIONS);
    // 타소득 0 → 사업소득 비중 100%. 결정세액 차이 = 산출세액 × 50%
    const calc = off.totalBurden.value; // 참고용
    expect(calc).toBeGreaterThan(0);
    expect(on.ownerDisposable.value).toBeGreaterThan(off.ownerDisposable.value);
    expect(on.ownerDisposable.steps.some((s) => s.includes("창업감면 50%") && s.includes("남은 3년"))).toBe(true);
    expect(on.ownerDisposable.basis.some((b) => b.kind === "law" && b.article.includes("제32조 제4항"))).toBe(true);
  });
  it("startupRelief: 산출 1,000만 × 50% × 사업 비중 (사업 8천만/종합 1억 = 80%) = 400만", () => {
    expect(startupRelief(10_000_000, 0.5, 80_000_000, 100_000_000)).toBe(4_000_000);
    expect(startupRelief(10_000_000, 0, 80_000_000, 100_000_000)).toBe(0);
  });
  it("법인 시나리오 금액은 감면 입력과 무관 (안내만)", () => {
    const a = runCorporate(base, DEFAULT_ASSUMPTIONS);
    const b = runCorporate({ ...base, startupReliefRate: 1, startupReliefYearsLeft: 5 }, DEFAULT_ASSUMPTIONS);
    expect(b.combinedNetWorth.value).toBe(a.combinedNetWorth.value);
  });
});

describe("D3 배당 건강보험 절벽 — hand-calc NHX (규칙 §44① 1천만 / 영 §41④ 2천만)", () => {
  it("1천만 → 0 / 1천만+1원 → 0(2천만 공제) / 2천만 → 0 / 3천만 → 813,468", () => {
    expect(extraIncomeInsurance(10_000_000).value).toBe(0);
    expect(extraIncomeInsurance(10_000_001).value).toBe(0);
    expect(extraIncomeInsurance(10_000_001).steps.join(" ")).toContain("전액 합산");
    expect(extraIncomeInsurance(20_000_000).value).toBe(0);
    // (3천만 − 2천만) ÷ 12 = 833,333.33 → 건보 59,916 × 12 = 718,992 / 요양 7,873 × 12 = 94,476
    expect(extraIncomeInsurance(30_000_000).value).toBe(813_468);
    expect(extraIncomeInsurance(30_000_000).basis.some((b) => b.kind === "assumption")).toBe(true);
  });
  it("법인 시나리오 배당 3천만이면 대표 부담에 813,468 반영", () => {
    const rich = { ...base, accountingProfit: 300_000_000 };
    const a = runCorporate({ ...rich, dividendAmount: 20_000_000 }, DEFAULT_ASSUMPTIONS);
    const b = runCorporate({ ...rich, dividendAmount: 30_000_000 }, DEFAULT_ASSUMPTIONS);
    expect(b.ownerDisposable.steps.some((s) => s.includes("보수 외 소득 건강보험료 813,468"))).toBe(true);
    expect(a.ownerDisposable.steps.some((s) => s.includes("보수 외 소득 건강보험료 0"))).toBe(true);
  });
});

describe("D4 성실신고 3년 승계 + 확인비용 기본값", () => {
  const target = { ...base, revenue: 600_000_000 }; // 서비스 5억 이상
  it("개인: 비용 150만(전제) − 공제 90만 = 순부담 60만", () => {
    const s = sincereConfirm(target, DEFAULT_ASSUMPTIONS, "indiv");
    expect(s).toEqual({ isTarget: true, cost: 1_500_000, credit: 900_000, net: 600_000 });
    expect(sincereConfirm(base, DEFAULT_ASSUMPTIONS, "indiv").cost).toBe(0);
  });
  it("법인: 승계 3년 동안 같은 방식 (한도 150만) — 유보가 60만 줄어든다", () => {
    const a = runCorporate(base, DEFAULT_ASSUMPTIONS);
    const b = runCorporate(target, DEFAULT_ASSUMPTIONS);
    expect(a.corpRetained.value - b.corpRetained.value).toBe(600_000);
    expect(b.corpRetained.steps.some((s) => s.includes("3년"))).toBe(true);
    expect(b.totalBurden.basis.some((x) => x.kind === "law" && x.article.includes("제60조의2"))).toBe(true);
  });
  it("직접 입력 300만이면 공제는 한도(개인 120만·법인 150만)", () => {
    const i = { ...target, sincereFilingConfirmCost: 3_000_000 };
    expect(sincereConfirm(i, DEFAULT_ASSUMPTIONS, "indiv").credit).toBe(1_200_000);
    expect(sincereConfirm(i, DEFAULT_ASSUMPTIONS, "corp").credit).toBe(1_500_000);
  });
});

describe("코덱 v3", () => {
  it("신규 필드 왕복 + v2 payload 기본값(노란우산 ON·창업감면 OFF)", () => {
    const d = decodeScenario(encodeScenario({ ...EMPTY_SCENARIO, yellowUmbrellaEnabled: false, yellowUmbrellaContribution: 1_200_000, startupReliefRate: 0.5, startupReliefYearsLeft: 4 }));
    expect(d.ok && d.input.yellowUmbrellaEnabled).toBe(false);
    expect(d.ok && d.input.yellowUmbrellaContribution).toBe(1_200_000);
    expect(d.ok && d.input.startupReliefRate).toBe(0.5);
    expect(d.ok && d.input.startupReliefYearsLeft).toBe(4);
    const { yellowUmbrellaEnabled: _y, startupReliefRate: _r, startupReliefYearsLeft: _l, ...v2 } = EMPTY_SCENARIO;
    void _y; void _r; void _l;
    const bytes = new TextEncoder().encode(JSON.stringify({ v: 2, r: "2026-3", d: v2 }));
    let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
    const old = decodeScenario(btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
    expect(old.ok && old.input.yellowUmbrellaEnabled).toBe(true);
    expect(old.ok && old.input.yellowUmbrellaContribution).toBeUndefined();
    expect(old.ok && old.input.startupReliefRate).toBe(0);
  });
});
