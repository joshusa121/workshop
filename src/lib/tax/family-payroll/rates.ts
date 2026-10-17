import type { Basis } from "@/lib/tax/sources";
import type { Bracket, RateEntry } from "@/lib/tax/rates";

// 법제처 Open API 본문 확인 2026-10-17. MST·시행일은 facts.md에 기록.
function law(name: string, article: string, effectiveFrom: string, appliesTo: string): Extract<Basis, { kind: "law" }> {
  return { kind: "law", law: name, article, url: `https://www.law.go.kr/법령/${name.replaceAll(" ", "")}/${article.split(" ")[0]}`, effectiveFrom, appliesTo, confirmedAt: "2026-10-17" };
}
export const EXPENSE_BASIS = law("소득세법", "제27조", "2026-07-01", "총수입금액에 대응하는 통상적인 비용. 실제 근무·급여 적정성 Josh 감수 필요");
export const PAYROLL_BASIS = law("소득세법 시행령", "제55조 제1항 제6호·제11호·제28호", "2026-10-01", "종업원 급여 및 사업 관련 사용자 부담 보험료. 입력 보험료의 경비 귀속 Josh 감수 필요");
export const RELATED_BASIS = law("소득세법", "제41조", "2026-07-01", "특수관계인 거래로 조세 부담을 부당하게 감소시키는 경우 재계산 가능");
export const SALARY_BASIS = law("소득세법", "제20조", "2026-07-01", "근로 제공의 대가를 근로소득으로 계산. 가족의 다른 소득이 없는 경우");
export const INPUT_BASIS: Basis = { kind: "assumption", description: "사용자가 확인해 입력한 연간 금액과 사실관계. 보험료는 고용 전보다 늘어난 실제 부담액. 세무·보험 적용 확정 아님", editable: true };
export const MODEL_BASIS: Basis = { kind: "assumption", description: "2026년 개인사업자 장부 신고·일반 근로자 한 명. 사업주 세액공제·감면은 고정으로 보고 산출세액 차이 비교. 각 단계 원 미만 절사, 신고 납부 끝수처리 미반영", editable: true };
export const INCOME_BRACKETS: RateEntry<Bracket[]> = {
  value: [{ upTo: 14_000_000, rate: 0.06 }, { upTo: 50_000_000, rate: 0.15 }, { upTo: 88_000_000, rate: 0.24 }, { upTo: 150_000_000, rate: 0.35 }, { upTo: 300_000_000, rate: 0.38 }, { upTo: 500_000_000, rate: 0.4 }, { upTo: 1_000_000_000, rate: 0.42 }, { upTo: null, rate: 0.45 }],
  basis: law("소득세법", "제55조 제1항", "2026-07-01", "2026년 귀속 종합소득세율표"),
};
export const LOCAL_BRACKETS: RateEntry<Bracket[]> = {
  value: [{ upTo: 14_000_000, rate: 0.006 }, { upTo: 50_000_000, rate: 0.015 }, { upTo: 88_000_000, rate: 0.024 }, { upTo: 150_000_000, rate: 0.035 }, { upTo: 300_000_000, rate: 0.038 }, { upTo: 500_000_000, rate: 0.04 }, { upTo: 1_000_000_000, rate: 0.042 }, { upTo: null, rate: 0.045 }],
  basis: law("지방세법", "제92조 제1항", "2026-07-01", "표준세율만 반영. 조례에 따른 가감 미반영"),
};
export const SALARY_DEDUCTION: RateEntry<{ brackets: Bracket[]; cap: number }> = {
  value: { brackets: [{ upTo: 5_000_000, rate: 0.7 }, { upTo: 15_000_000, rate: 0.4 }, { upTo: 45_000_000, rate: 0.15 }, { upTo: 100_000_000, rate: 0.05 }, { upTo: null, rate: 0.02 }], cap: 20_000_000 },
  basis: law("소득세법", "제47조 제1항", "2026-07-01", "연간 총급여의 구간별 근로소득공제. 한도 2천만원"),
};
export const BASIC: RateEntry<number> = { value: 1_500_000, basis: law("소득세법", "제50조 제1항", "2026-07-01", "직원 본인 기본공제 및 종전 사업주 부양공제 상실 검토") };
export const DEPENDENT_SALARY_LIMIT: RateEntry<number> = { value: 5_000_000, basis: law("소득세법", "제50조 제1항 제2호·제3호", "2026-07-01", "근로소득만 있는 가족의 총급여 500만원 이하. 다른 부양 요건은 사용자가 확인") };
export const PENSION_BASIS = law("소득세법", "제51조의3 제1항", "2026-07-01", "직원 본인 부담 공적연금 보험료 소득공제");
export const SPECIAL_BASIS = law("소득세법", "제52조 제1항", "2026-07-01", "직원 부담 건강·장기요양·고용보험료 특별소득공제");
export const STANDARD: RateEntry<number> = { value: 130_000, basis: law("소득세법", "제59조의4 제9항 제1호", "2026-07-01", "특별소득공제·특별세액공제·월세공제 미신청 근로자의 표준세액공제. 보험료 특별소득공제와 중복 금지") };
export const WAGE_CREDIT: RateEntry<{ threshold: number; lowRate: number; base: number; highRate: number; limits: { salary: number | null; start: number; from: number; reduce: number; floor: number }[] }> = {
  value: { threshold: 1_300_000, lowRate: 0.55, base: 715_000, highRate: 0.3, limits: [
    { salary: 33_000_000, start: 740_000, from: 0, reduce: 0, floor: 740_000 },
    { salary: 70_000_000, start: 740_000, from: 33_000_000, reduce: 0.008, floor: 660_000 },
    { salary: 120_000_000, start: 660_000, from: 70_000_000, reduce: 0.5, floor: 500_000 },
    { salary: null, start: 500_000, from: 120_000_000, reduce: 0.5, floor: 200_000 },
  ] }, basis: law("소득세법", "제59조 제1항·제2항", "2026-07-01", "산출세액 기준 근로소득세액공제와 총급여별 한도"),
};
export const LOCAL_CREDIT: RateEntry<number> = { value: 0.1, basis: { ...law("지방세특례제한법", "제167조의2 제1항", "2026-06-02", "소득세 공제액의 10% 지방소득세 공제. 지방세 표준세율 가정, 2026 귀속 한정"), sunset: "2026-12-31" } };
export const INSURANCE_BASES: Basis[] = [
  law("국민연금법", "제8조", "2026-06-17", "사업장가입자 및 제외 요건. 연령·근로형태는 공단 확인 필요"),
  law("국민건강보험법", "제6조", "2026-10-08", "사업장 근로자의 직장가입 및 제외 요건. 피부양자 변동·대표자 전환은 공단 확인 필요"),
  law("근로기준법", "제11조", "2026-10-08", "동거 친족만 사용하는 사업장 적용 제외. 이 조항만으로 모든 보험 제외를 단정하지 않음"),
];
