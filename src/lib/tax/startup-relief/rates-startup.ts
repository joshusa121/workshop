import type { RateEntry } from "@/lib/tax/rates";
import type { Basis } from "@/lib/tax/sources";

const ACT_URL = "https://www.law.go.kr/법령/조세특례제한법";
const DECREE_URL = "https://www.law.go.kr/법령/조세특례제한법시행령";
function law(article: string, appliesTo: string, decree = false): Basis {
  return { kind: "law", law: decree ? "조세특례제한법 시행령" : "조세특례제한법", article,
    url: decree ? DECREE_URL : ACT_URL, effectiveFrom: "2026-09-18", appliesTo, confirmedAt: "2026-10-17" };
}
export const STARTUP_BASIS = {
  rate: law("제6조 제1항 제1호", "2025년 창업과 2026년 이후 창업의 지역·청년 구분"),
  period: law("제6조 제1항", "최초 소득 발생 연도(창업 후 5년 도래 연도까지 무소득이면 그 연도) 및 이후 4년"),
  industry: law("제6조 제3항 · 시행령 제5조 제6~10항", "열거된 업종만 대상. 실제 산업분류는 Josh 감수"),
  startup: law("제6조 제10항 제1~4호", "법인전환·동종 재창업·사업 확장 제외. 승계 예외 별도 검토"),
  youth: law("제5조 제1~2항 · 제27조 제1항 제1호 각 목", "청년 대표자 연령·병역 종류·법인 지배주주 및 최대주주 요건 확인", true),
  sme: law("제6조 제1항·제11항", "시행령 제2조에 따른 중소기업에 해당한다는 입력 전제"),
  application: law("제6조 제12항 · 시행령 제5조 제26항", "과세표준 신고와 함께 세액감면신청 필요"),
} satisfies Record<string, Basis>;
export const STARTUP_RATES: RateEntry<{
  before2026: { youth: number[]; ordinary: number[] };
  from2026: { youth: number[]; ordinary: number[] };
}> = {
  // 순서: 수도권 밖 / 수도권 인구감소 / 수도권 비과밀·비인구감소 / 과밀
  value: { before2026: { youth: [1, 1, 1, 0.5], ordinary: [0.5, 0.5, 0.5, 0] },
    from2026: { youth: [1, 1, 0.75, 0.5], ordinary: [0.5, 0.5, 0.25, 0] } },
  basis: STARTUP_BASIS.rate,
};
export const LOW_REVENUE: RateEntry<number> = { value: 104_000_000,
  basis: law("제6조 제6항 · 부칙 <제21223호, 2025.12.23> 제1~2조", "2026년 이후 개시 과세연도. 수입금액 1억4백만원 이하, 단기 과세연도는 연환산") };
export const LOW_REVENUE_RATES: RateEntry<{ before2026: number[]; from2026: number[] }> = {
  value: { before2026: [1, 1, 1, 0.5], from2026: [1, 1, 0.75, 0.5] }, basis: LOW_REVENUE.basis,
};
export const RELIEF_CAP: RateEntry<number> = { value: 500_000_000,
  basis: law("제6조 제13항 · 부칙 <제20617호, 2024.12.31> 제1~2조", "2025년 이후 창업 등에 적용. 과세연도별 감면 합계 한도 5억원") };
export const RELIEF_YEARS: RateEntry<number> = { value: 5, basis: STARTUP_BASIS.period };
export const STARTUP_SUNSET: RateEntry<string> = { value: "2027-12-31",
  basis: { ...STARTUP_BASIS.rate, ...(STARTUP_BASIS.rate.kind === "law" ? { sunset: "2027-12-31" } : {}) } };
