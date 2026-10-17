import type { Basis } from "@/lib/tax/sources";
import type { RateEntry, Bracket } from "@/lib/tax/rates";

/** 법제처 Open API로 2026-10-17 재확인. */
function law(law: string, article: string, effectiveFrom: string, appliesTo: string): Basis {
  return { kind: "law", law, article, url: `https://www.law.go.kr/법령/${encodeURIComponent(law)}/${encodeURIComponent(article.split(" ")[0].split("·")[0])}`, effectiveFrom, appliesTo, confirmedAt: "2026-10-17" };
}
export const SERVICE_BASIS = law("소득세법", "제48조 제1항 제1호·제2항", "2026-07-01", "2026년 귀속. 근속연수는 1년 미만 올림, 공제는 퇴직소득금액 한도");
export const CONVERTED_BASIS = law("소득세법", "제48조 제1항 제2호", "2026-07-01", "근속연수공제 후 ÷ 근속연수 × 12, 환산급여공제 적용");
export const FORMULA_BASIS = law("소득세법", "제14조 제6항·제55조 제2항", "2026-07-01", "환산 과세표준에 기본세율 적용 후 ÷ 12 × 근속연수");
export const EXECUTIVE_BASIS = law("소득세법", "제22조 제3항·제4항", "2026-07-01", "2012~2019년 3배 + 2020년 이후 2배. 한도 초과분은 근로소득, 월 미만 올림");
export const PRE2012_BASIS = law("소득세법 시행령", "제42조의2 제6항", "2026-10-01", "2011년 말 이전 근무월수 / 전체 근무월수로 비례. 당시 정관에 따른 금액 선택은 미반영");
export const PERIOD_BASIS = law("소득세법 시행령", "제105조 제1항", "2026-10-01", "근로 시작일~퇴직일, 퇴직급여 산정 제외기간은 차감. 중간정산 미반영");
export const ROUND_BASIS = law("국고금 관리법", "제47조 제1항·제2항", "2026-01-02", "과세표준 1원 미만, 국세 수입 10원 미만 끝수 미계산");
export const LOCAL_ROUND_BASIS = law("지방회계법", "제55조", "2026-01-02", "지방세 수입 10원 미만 끝수 미계산 적용");
export const SMALL_TAX_BASIS = law("소득세법", "제86조 제1호·제146조 제1항", "2026-07-01", "한 번의 일시금 지급 기준, 원천징수세액 1천원 미만 부징수");
export const LOCAL_TAX: RateEntry<number> = { value: 0.1, basis: law("지방세법", "제103조의13 제1항", "2026-07-01", "퇴직소득세 원천징수세액의 100분의 10 특별징수") };
export const MONTHS_PER_YEAR = 12;
export const EXECUTIVE_RULE = { ratio: 0.1, multiple2012: 3, multiple2020: 2 };
export const SERVICE_DEDUCTION: RateEntry<{ upTo: number | null; base: number; perYear: number; from: number }[]> = {
  value: [
    { upTo: 5, base: 0, perYear: 1_000_000, from: 0 },
    { upTo: 10, base: 5_000_000, perYear: 2_000_000, from: 5 },
    { upTo: 20, base: 15_000_000, perYear: 2_500_000, from: 10 },
    { upTo: null, base: 40_000_000, perYear: 3_000_000, from: 20 },
  ], basis: SERVICE_BASIS,
};
export const CONVERTED_DEDUCTION: RateEntry<{ upTo: number | null; base: number; rate: number; from: number }[]> = {
  value: [
    { upTo: 8_000_000, base: 0, rate: 1, from: 0 },
    { upTo: 70_000_000, base: 8_000_000, rate: 0.6, from: 8_000_000 },
    { upTo: 100_000_000, base: 45_200_000, rate: 0.55, from: 70_000_000 },
    { upTo: 300_000_000, base: 61_700_000, rate: 0.45, from: 100_000_000 },
    { upTo: null, base: 151_700_000, rate: 0.35, from: 300_000_000 },
  ], basis: CONVERTED_BASIS,
};
export const BASIC_BRACKETS: RateEntry<Bracket[]> = {
  value: [
    { upTo: 14_000_000, rate: 0.06 }, { upTo: 50_000_000, rate: 0.15 },
    { upTo: 88_000_000, rate: 0.24 }, { upTo: 150_000_000, rate: 0.35 },
    { upTo: 300_000_000, rate: 0.38 }, { upTo: 500_000_000, rate: 0.4 },
    { upTo: 1_000_000_000, rate: 0.42 }, { upTo: null, rate: 0.45 },
  ], basis: law("소득세법", "제55조 제1항", "2026-07-01", "Open API 본문의 표 flSeq=123278409 확인. 환산 과세표준에 기본 누진세율 적용"),
};
