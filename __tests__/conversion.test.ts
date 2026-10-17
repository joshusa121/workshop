import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "../src/lib/tax/assumptions";
import { conversionCosts, isOvercrowdedZone } from "../src/lib/tax/conversion/cost";
import { assessMethods, hasBusinessRealEstate, isGoodwillCandidate, minCapitalForRelief, reliefLossIfUnmet, reliefVersusCost } from "../src/lib/tax/conversion/method";
import { sincereFilingStatus, sincereFilingTimeline } from "../src/lib/tax/conversion/sincere-filing";
import type { ScenarioInput } from "../src/lib/tax/scenario-input";

const base: ScenarioInput = {
  revenue: 600_000_000,
  accountingProfit: 80_000_000,
  taxAdjustment: 0,
  industryGroup: "서비스임대",
  workplace: { sido: "서울특별시" },
  assets: { total: 200_000_000, realEstate: 50_000_000, housing: 0 },
  liabilities: 40_000_000,
  ownerSalary: 48_000_000,
  dividendAmount: 11_156_609,
  retirementMultiple: 2,
  familyWorkers: 0,
  familySalaryEach: 36_000_000,
  familyLivesSeparately: false,  plansRealEstatePurchase: false,
  nonTaxReasons: false,
  yellowUmbrellaEnabled: false,
  startupReliefRate: 0,
  startupReliefYearsLeft: 3,
  retirementPlan: false,
  bookkeepingType: "복식부기",
  sincereFilingConfirmCost: 0,
  voluntaryEmploymentIns: false,
  voluntaryWorkersComp: false,
  personalContext: { otherIncome: 0 },
};

describe("성실신고", () => {
  it("서비스 5억 이상이면 대상", () => {
    const s = sincereFilingStatus("서비스임대", 600_000_000);
    expect(s.isTarget).toBe(true);
    expect(s.threshold.value).toBe(500_000_000);
    expect(s.threshold.basis[0]?.kind === "law" && s.threshold.basis[0].article).toContain("133");
  });

  it("선형 외삽으로 진입 연도", () => {
    const t = sincereFilingTimeline("서비스임대", [
      { year: 2024, revenue: 300_000_000 },
      { year: 2025, revenue: 400_000_000 },
    ]);
    expect(t.expectedYear).toBe(2026);
  });

  it("이력 없으면 미확인", () => {
    expect(sincereFilingTimeline("서비스임대", []).expectedYear).toBeNull();
  });
});

describe("전환 방법", () => {
  it("순자산가액 = 자산−부채", () => {
    expect(minCapitalForRelief(base).value).toBe(160_000_000);
  });

  it("주택이 있으면 세감면 경로 곤란", () => {
    const withHouse = { ...base, assets: { ...base.assets, housing: 10_000_000 } };
    const methods = assessMethods(withHouse);
    const relief = methods.filter((m) => m.method === "세감면포괄양수도" || m.method === "현물출자");
    expect(relief.every((m) => m.viability === "곤란")).toBe(true);
  });

  it("신설법인은 이월과세 없음을 고지", () => {
    const neu = assessMethods(base).find((m) => m.method === "신설법인");
    expect(neu?.expertItems.some((s) => s.includes("이월과세"))).toBe(true);
  });

  it("세감면 경로는 제외업종·자본금을 미확인으로 둔다", () => {
    const relief = assessMethods(base).find((m) => m.method === "현물출자");
    const ids = relief?.unverified.map((c) => c.id) ?? [];
    expect(ids).toContain("excluded-corp");
    expect(ids).toContain("rental-exclusion");
    expect(ids).toContain("capital");
    expect(relief?.unverified.find((c) => c.id === "excluded-corp")?.result).toBe("미확인");
  });
});

describe("과밀억제권역 판정 — 수도권정비계획법 시행령 별표 1", () => {
  it("서울 전역 해당", () => {
    expect(isOvercrowdedZone({ sido: "서울특별시" })).toBe("해당");
  });
  it("경기 전역 시 (수원·성남·고양)", () => {
    expect(isOvercrowdedZone({ sido: "경기도", sigungu: "수원시" })).toBe("해당");
    expect(isOvercrowdedZone({ sido: "경기도", sigungu: "성남시 분당구" })).toBe("해당");
  });
  it("경기 비해당 시 (용인·화성)", () => {
    expect(isOvercrowdedZone({ sido: "경기도", sigungu: "용인시" })).toBe("비해당");
    expect(isOvercrowdedZone({ sido: "경기도", sigungu: "화성시" })).toBe("비해당");
  });
  it("일부만 해당하는 시는 미확인 (남양주·시흥·인천)", () => {
    expect(isOvercrowdedZone({ sido: "경기도", sigungu: "남양주시" })).toBe("미확인");
    expect(isOvercrowdedZone({ sido: "경기도", sigungu: "시흥시" })).toBe("미확인");
    expect(isOvercrowdedZone({ sido: "인천광역시", sigungu: "남동구" })).toBe("미확인");
  });
  it("경기·인천에 시군구 없으면 미확인, 그 외 시도는 비해당", () => {
    expect(isOvercrowdedZone({ sido: "경기도" })).toBe("미확인");
    expect(isOvercrowdedZone({ sido: "부산광역시" })).toBe("비해당");
  });
});

describe("전환 비용 — hand-calc REG·ACQ", () => {
  it("REG-a 서울, 순자산 1.6억 → 640,000 × 3 = 1,920,000", () => {
    const c = conversionCosts(base, DEFAULT_ASSUMPTIONS);
    expect(c.registrationTax.value).toBe(1_920_000);
    expect(c.registrationTax.basis.some((b) => b.kind === "law" && b.article.includes("제28조"))).toBe(true);
  });
  it("REG-b 부산, 순자산 1.6억 → 640,000", () => {
    const c = conversionCosts({ ...base, workplace: { sido: "부산광역시" } }, DEFAULT_ASSUMPTIONS);
    expect(c.registrationTax.value).toBe(640_000);
  });
  it("REG-c 최저세액 — 자본 1천만: 부산 112,500 / 서울 337,500", () => {
    const small = { ...base, assets: { total: 10_000_000, realEstate: 0, housing: 0 }, liabilities: 0 };
    expect(conversionCosts({ ...small, workplace: { sido: "부산광역시" } }, DEFAULT_ASSUMPTIONS).registrationTax.value).toBe(112_500);
    expect(conversionCosts(small, DEFAULT_ASSUMPTIONS).registrationTax.value).toBe(337_500);
  });
  it("REG-d 과밀 미확인이면 비중과 금액 + 안내", () => {
    const c = conversionCosts({ ...base, workplace: { sido: "경기도" } }, DEFAULT_ASSUMPTIONS);
    expect(c.registrationTax.value).toBe(640_000);
    expect(c.registrationTax.steps.some((s) => s.includes("미확인"))).toBe(true);
  });
  it("ACQ-a 서울 부동산 5천만 → 8% 4,000,000, 감면 후 2,000,000", () => {
    const c = conversionCosts(base, DEFAULT_ASSUMPTIONS);
    expect(c.acquisitionTax.value).toBe(4_000_000);
    expect(c.acquisitionTaxAfterRelief.value).toBe(2_000_000);
    expect(c.acquisitionTax.basis.some((b) => b.kind === "law" && b.article.includes("제13조"))).toBe(true);
  });
  it("ACQ-b 부산 부동산 5천만 → 4% 2,000,000, 감면 후 1,000,000", () => {
    const c = conversionCosts({ ...base, workplace: { sido: "부산광역시" } }, DEFAULT_ASSUMPTIONS);
    expect(c.acquisitionTax.value).toBe(2_000_000);
    expect(c.acquisitionTaxAfterRelief.value).toBe(1_000_000);
  });
  it("ACQ-c 주택은 과세 대상 부동산에서 제외", () => {
    const c = conversionCosts(
      { ...base, workplace: { sido: "부산광역시" }, assets: { total: 200_000_000, realEstate: 50_000_000, housing: 20_000_000 } },
      DEFAULT_ASSUMPTIONS,
    );
    expect(c.acquisitionTax.value).toBe(1_200_000);
  });
  it("감면 미충족 손실액 = 취득세 감면분", () => {
    expect(reliefLossIfUnmet(base).value).toBe(2_000_000);
  });
});

describe("설립 자본금 입력 (capital)", () => {
  it("REG-e 자본금 1억 입력, 서울 → 400,000 × 3 = 1,200,000 (순자산 대용 안 씀)", () => {
    const c = conversionCosts({ ...base, capital: 100_000_000 }, DEFAULT_ASSUMPTIONS);
    expect(c.registrationTax.value).toBe(1_200_000);
    expect(c.registrationTax.steps[0]).toContain("입력");
    expect(c.registrationTax.basis.some((b) => b.kind === "assumption" && b.description.includes("순자산"))).toBe(false);
  });
  it("자본금 미입력이면 순자산 대용 + 가정 basis", () => {
    const c = conversionCosts(base, DEFAULT_ASSUMPTIONS);
    expect(c.registrationTax.steps[0]).toContain("대용");
    expect(c.registrationTax.basis.some((b) => b.kind === "assumption" && b.description.includes("순자산"))).toBe(true);
  });
  it("자본금 1억 < 순자산 1.6억 → capital 미충족 (부족 6천만)", () => {
    const relief = assessMethods({ ...base, capital: 100_000_000 }).find((m) => m.method === "현물출자");
    const cap = relief?.unverified.find((c) => c.id === "capital");
    expect(cap?.result).toBe("미충족");
    expect(cap?.detail).toContain("60,000,000");
    expect(relief?.satisfied.some((c) => c.id === "capital")).toBe(false);
  });
  it("자본금 2억 ≥ 순자산 1.6억 → capital 충족", () => {
    const relief = assessMethods({ ...base, capital: 200_000_000 }).find((m) => m.method === "세감면포괄양수도");
    expect(relief?.satisfied.find((c) => c.id === "capital")?.result).toBe("충족");
    expect(relief?.unverified.some((c) => c.id === "capital")).toBe(false);
  });
});

describe("전환 방법 순위 (Josh 2026-09-26)", () => {
  it("부동산 있음: 세감면 포괄양수도 1순위, 현물출자 2순위", () => {
    const m = assessMethods(base).sort((x, y) => x.rank - y.rank);
    expect(m[0].method).toBe("세감면포괄양수도");
    expect(m[0].viability).toBe("유력");
    expect(m[1].method).toBe("현물출자");
    expect(m[1].note).toContain("현금으로 마련하기 어려울 때");
  });
  it("부동산 없음: 일반 사업양수도 1순위, 포괄양수도 부가세는 미확인 유지", () => {
    const m = assessMethods({ ...base, assets: { total: 100_000_000, realEstate: 0, housing: 0 } }).sort((x, y) => x.rank - y.rank);
    expect(m[0].method).toBe("일반양수도");
    expect(m[0].viability).toBe("유력");
    expect(m[0].unverified.some((c) => c.id === "vat" && c.result === "미확인")).toBe(true);
  });
  it("주택만 있으면 부동산 없음으로 본다", () => {
    expect(hasBusinessRealEstate({ ...base, assets: { total: 100_000_000, realEstate: 50_000_000, housing: 50_000_000 } })).toBe(false);
  });
});

describe("세감면 실익 vs 감정평가·법무 비용", () => {
  it("SC4 서울: 감면액 200만 < 비용 700만 → 일반 양수도 우선 제안", () => {
    const r = reliefVersusCost(base, DEFAULT_ASSUMPTIONS);
    expect(r.benefit.value).toBe(2_000_000);
    expect(r.cost.value).toBe(7_000_000);
    expect(r.preferGeneral).toBe(true);
    expect(r.cost.basis.some((b) => b.kind === "assumption")).toBe(true);
  });
  it("부동산 5억 서울: 감면액 2,000만 > 비용 → 제안 없음", () => {
    const r = reliefVersusCost({ ...base, assets: { total: 600_000_000, realEstate: 500_000_000, housing: 0 } }, DEFAULT_ASSUMPTIONS);
    expect(r.preferGeneral).toBe(false);
  });
  it("부동산 0: 감면액 0 → 비교 무의미, 제안 없음", () => {
    const r = reliefVersusCost({ ...base, assets: { total: 100_000_000, realEstate: 0, housing: 0 } }, DEFAULT_ASSUMPTIONS);
    expect(r.benefit.value).toBe(0);
    expect(r.preferGeneral).toBe(false);
  });
  it("전제 수정이 반영된다", () => {
    const r = reliefVersusCost(base, { ...DEFAULT_ASSUMPTIONS, appraisalCost: 500_000, inKindContributionLegalCost: 1_000_000 });
    expect(r.cost.value).toBe(1_500_000);
    expect(r.preferGeneral).toBe(false);
  });
});

describe("영업권 검토 대상 뱃지", () => {
  it("서비스업·이익 2억·순자산 1.6억 → 대상", () => {
    expect(isGoodwillCandidate({ ...base, accountingProfit: 200_000_000 })).toBe(true);
  });
  it("이익 2억 미만이면 아님", () => {
    expect(isGoodwillCandidate({ ...base, accountingProfit: 199_999_999 })).toBe(false);
  });
  it("제조업이면 아님", () => {
    expect(isGoodwillCandidate({ ...base, accountingProfit: 300_000_000, industryGroup: "제조건설음식숙박" })).toBe(false);
  });
  it("순자산 × 10%가 이익 이상이면 아님", () => {
    expect(isGoodwillCandidate({ ...base, accountingProfit: 200_000_000, assets: { total: 3_000_000_000, realEstate: 0, housing: 0 }, liabilities: 0 })).toBe(false);
  });
});
