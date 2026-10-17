import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ExpenseResult } from "@/components/expense-check/ExpenseResult";
import { computeExpense } from "@/lib/tax/expense-check/engine";
import { DEFAULT_INPUT, validateInput, type ExpenseInput } from "@/lib/tax/expense-check/input";
import { decodeExpense, encodeExpense } from "@/lib/tax/expense-check/share";

const run = (p: Partial<ExpenseInput>) => computeExpense({ ...DEFAULT_INPUT, ...p });

describe("경비처리 독립 손계산 fixture", () => {
  it("F1 일반 지출 3만원 경계는 간이영수증도 증빙 예외", () => {
    expect(run({ amount: 30_000, evidence: "receipt" }).allowed?.value).toBe(30_000);
  });
  it("F2 3만원 초과 증빙 누락은 자동 부인이 아닌 감수", () => {
    const r = run({ amount: 30_001, evidence: "receipt" });
    expect(r.allowed).toBeNull();
    expect(r.verdict).toBe("Josh 감수");
    expect(r.excluded).toBeNull();
  });
  it("F3 사업 무관 지출은 적격증빙이 있어도 제외", () => {
    expect(run({ amount: 100_000, businessUse: false }).allowed?.value).toBe(0);
  });
  it("F4 중소 업무추진비 매출 100억원 경계", () => {
    const r = run({ category: "entertainment", amount: 70_000_000, revenue: 10_000_000_000 });
    expect(r.limit?.value).toBe(66_000_000);
    expect(r.allowed?.value).toBe(66_000_000);
    expect(r.excluded?.value).toBe(4_000_000);
  });
  it("F5 일반법인 500억원 경계", () => {
    const r = run({ category: "entertainment", sme: false, amount: 130_000_000, revenue: 50_000_000_000 });
    expect(r.limit?.value).toBe(122_000_000);
    expect(r.excluded?.value).toBe(8_000_000);
  });
  it("F6 단기 사업연도·증빙부인·문화 및 시장 별도한도", () => {
    const r = run({ category: "entertainment", months: 6, revenue: 0, amount: 30_000_000,
      proofExcluded: 1_000_000, culture: 5_000_000, market: 2_000_000 });
    // 기본 1,800만 + min(문화500만,360만) + min(시장200만,360만)
    expect(r.limit?.value).toBe(23_600_000);
    expect(r.allowed?.value).toBe(23_600_000);
    expect(r.excluded?.value).toBe(6_400_000);
  });
  it("F7 무기록 승용차: 업무사용비율 후 감가상각 별도한도", () => {
    const r = run({ category: "car", amount: 20_000_000, depreciation: 12_000_000, logbook: false });
    // 비율 .75, 감가 900만 중 800만 + 유지비800만*.75=600만
    expect(r.allowed?.value).toBe(14_000_000);
    expect(r.deferred?.value).toBe(1_000_000);
    expect(r.excluded?.value).toBe(6_000_000);
  });
  it("F8 운행기록 있으면 1,500만원이 전체 한도가 아님", () => {
    const r = run({ category: "car", amount: 30_000_000, depreciation: 10_000_000,
      logbook: true, businessPercent: 80 });
    expect(r.allowed?.value).toBe(24_000_000);
    expect(r.deferred?.value).toBe(0);
  });
  it("F9 전용보험 미가입은 전액 제외", () => {
    expect(run({ category: "car", amount: 15_000_000, insured: false }).allowed?.value).toBe(0);
  });
  it("F10 감가상각 계상액과 검증한 상각범위액 비교", () => {
    const r = run({ category: "asset", amount: 12_000_000, taxDepreciation: 8_000_000 });
    expect(r.allowed?.value).toBe(8_000_000);
    expect(r.deferred?.value).toBe(4_000_000);
  });
  it("F11 무기록 승용차 1,500만원 경계 및 800만원 감가 한도", () => {
    const r = run({ category: "car", amount: 15_000_000, depreciation: 8_000_000 });
    expect(r.allowed?.value).toBe(15_000_000);
  });
  it("F12 매출 500억원 초과 최고 구간", () => {
    const r = run({ category: "entertainment", sme: false, revenue: 60_000_000_000, amount: 130_000_000 });
    // 1,200만 + 3,000만 + 8,000만 + (100억 × .03%) 300만
    expect(r.allowed?.value).toBe(125_000_000);
    expect(r.excluded?.value).toBe(5_000_000);
  });
  it("개인사업자 일반 지출의 동일 증빙 경계", () => {
    expect(run({ entity: "individual", amount: 30_000, evidence: "receipt" }).allowed?.value).toBe(30_000);
    expect(run({ entity: "individual", category: "car" }).allowed).toBeNull();
  });
  it("특수 법인과 일부기간 보유 승용차는 임의 계산하지 않음", () => {
    expect(run({ category: "car", months: 6 }).allowed).toBeNull();
    expect(run({ category: "entertainment", specialCorp: true }).allowed).toBeNull();
    expect(run({ category: "car", plateCompliant: false }).allowed?.value).toBe(0);
    expect(run({ category: "car", partialInsurance: true, insured: false }).allowed).toBeNull();
  });
  it("모든 산출금액에 근거가 있고 사람용 URL만 사용", () => {
    for (const category of ["general", "entertainment", "car", "asset"] as const) {
      const r = run({ category });
      for (const v of [r.amount, r.allowed, r.excluded, r.deferred, r.limit, ...r.details]) {
        if (v) {
          expect(v.basis.length).toBeGreaterThan(0);
          for (const b of v.basis) if (b.kind === "law") expect(b.url).not.toMatch(/OC=|DRF/);
        }
      }
    }
  });
  it("전부 증빙부인·특수관계 매출·증빙 전무·개인 사업무관의 안전한 처리", () => {
    expect(run({ category: "entertainment", amount: 10_000_000, proofExcluded: 10_000_000 }).allowed?.value).toBe(0);
    expect(run({ category: "entertainment", relatedRevenue: true }).allowed).toBeNull();
    expect(run({ amount: 30_000, evidence: "none" }).allowed).toBeNull();
    expect(run({ entity: "individual", businessUse: false }).allowed).toBeNull();
  });
});

describe("입력·공유 링크", () => {
  it("음수·비정수·무한대와 모순된 부분금액을 거부", () => {
    for (const amount of [-1, 0.5, Infinity, NaN]) expect(validateInput({ ...DEFAULT_INPUT, amount }).length).toBeGreaterThan(0);
    expect(validateInput({ ...DEFAULT_INPUT, category: "car", depreciation: 100_001, amount: 100_000 }).length).toBeGreaterThan(0);
    expect(validateInput({ ...DEFAULT_INPUT, category: "entertainment", amount: 100, culture: 60, market: 60 }).length).toBeGreaterThan(0);
    expect(() => run({ amount: -1 })).toThrow();
  });
  it("왕복 및 깨진 링크·이전 버전·누락 필드·변경 세율", () => {
    const s = encodeExpense(DEFAULT_INPUT);
    expect(decodeExpense(s)).toEqual({ ok: true, input: DEFAULT_INPUT, ratesChanged: false });
    expect(decodeExpense("broken").ok).toBe(false);
    const payload = (p: unknown) => btoa(JSON.stringify(p)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    expect(decodeExpense(payload({ v: 0, d: DEFAULT_INPUT })).ok).toBe(false);
    expect(decodeExpense(payload({ v: 1, d: {} })).ok).toBe(false);
    const changed = decodeExpense(payload({ v: 1, r: "old", d: DEFAULT_INPUT }));
    expect(changed.ok && changed.ratesChanged).toBe(true);
  });
});

describe("결과·인쇄 보고서 렌더", () => {
  it.each(["general", "entertainment", "car", "asset"] as const)("%s: 금액·전제·감수·인쇄 계산 과정 렌더", category => {
    const input = { ...DEFAULT_INPUT, category };
    const html = renderToString(createElement(ExpenseResult, { input, result: computeExpense(input) }));
    for (const text of ["작업실 · 작성일", "세율 버전", "전제와 미반영", "Josh 감수", "계산 과정", "본 계산은 참고용"]) expect(html).toContain(text);
    expect(html).not.toContain("OC=");
    expect(html).toContain("https://www.law.go.kr/법령/");
  });
  it("감수 상태를 0원 인정으로 출력하지 않음", () => {
    const input = { ...DEFAULT_INPUT, category: "car" as const, partialInsurance: true };
    const html = renderToString(createElement(ExpenseResult, { input, result: computeExpense(input) }));
    expect(html).toContain("자동 계산 범위를 벗어납니다");
    expect(html).not.toContain("당기 비용 인정 검토액");
  });
});
