import type { Basis } from "@/lib/tax/sources";
import type { Bracket, RateEntry } from "@/lib/tax/rates";

export function lawBasis(law: string, article: string, effectiveFrom: string, appliesTo: string): Basis {
  return { kind: "law", law, article, effectiveFrom, appliesTo, confirmedAt: "2026-10-17", url: `https://www.law.go.kr/법령/${encodeURIComponent(law)}/${encodeURIComponent(article.split(" ")[0].split("·")[0])}` };
}
export const INCOME_BASIS = lawBasis("소득세법", "제14조·제50조·제55조", "2026-07-01", "2026년 귀속 거주자. 본인 기본공제만 반영, 세액공제 전 증분 산출세액");
export const SEPARATE_BASIS = lawBasis("소득세법", "제14조 제3항 제7호·제64조의2", "2026-07-01", "과세대상 주택 총수입금액 기준, 분리·종합 중 낮은 산출세액");
export const REGISTERED_BASIS = lawBasis("소득세법 시행령", "제122조의2", "2026-10-01", "전 기간·전 주택 등록 특례 요건 충족을 사용자가 확인한 경우만 적용");
export const CORP_BASIS = lawBasis("법인세법", "제55조 제1항·제60조의2 제1항 제1호", "2026-07-01", "2026.1.1. 개시, 1년 사업연도 내국법인");
export const SMALL_BASIS = lawBasis("법인세법 시행령", "제42조 제2항~제5항·제97조의4 제2항", "2026-10-01", "지배주주 지분·임대 주업 등·상시근로자 요건, 사용자 판단 — Josh 감수 필요");
export const LOCAL_PERSONAL_BASIS = lawBasis("지방세법", "제92조·제93조 제10항·제11항", "2026-07-01", "개인지방소득세 표준세율. 조례 가감 미반영 — Josh 감수 필요");
export const LOCAL_CORP_BASIS = lawBasis("지방세법", "제103조의20", "2026-07-01", "법인지방소득세 표준세율. 조례 가감 미반영 — Josh 감수 필요");
export const DIVIDEND_BASIS = lawBasis("소득세법", "제17조 제1항 제1호·제129조 제1항 제2호 나목·제14조 제3항 제6호", "2026-07-01", "국내 일반 배당 원천징수. 금융소득 합계 기준 초과 시 최종세액 미계산");
export const LOCAL_DIVIDEND_BASIS = lawBasis("지방세법", "제103조의13 제1항", "2026-07-01", "배당 원천징수 소득세의 10% 특별징수");
export const ROUND_BASIS = lawBasis("국고금 관리법", "제47조", "2026-01-02", "과표 원 미만, 국세 납부액 10원 미만 버림. 이 모형은 세액별 연간 1회 납부로 단순화");
export const LOCAL_ROUND_BASIS = lawBasis("지방회계법", "제55조", "2026-01-02", "지방세 10원 미만 버림을 가정, 실제 납부 단위 확인 — Josh 감수 필요");
export const MODEL_BASIS: Basis = { kind: "assumption", description: "동일 수입·경비, 세무조정 없음, 1인 주주, 대표 급여 없음. 적자 통산·이월결손금·세액공제·감면·건보료·설립 유지비 미반영. 유보금은 법인 자금이며 인출 시 미래 세금 미계산", editable: true };
export const RENTAL_RULES: RateEntry<{ limit: number; rate: number; expense: number; registeredExpense: number; allowance: number; registeredAllowance: number; basic: number }> = {
  value: { limit: 20_000_000, rate: 0.14, expense: 50, registeredExpense: 60, allowance: 2_000_000, registeredAllowance: 4_000_000, basic: 1_500_000 }, basis: SEPARATE_BASIS,
};
export const INCOME_BRACKETS: RateEntry<Bracket[]> = { value: [
  { upTo: 14_000_000, rate: 0.06 }, { upTo: 50_000_000, rate: 0.15 }, { upTo: 88_000_000, rate: 0.24 }, { upTo: 150_000_000, rate: 0.35 }, { upTo: 300_000_000, rate: 0.38 }, { upTo: 500_000_000, rate: 0.4 }, { upTo: 1_000_000_000, rate: 0.42 }, { upTo: null, rate: 0.45 },
], basis: INCOME_BASIS };
export const LOCAL_INCOME_BRACKETS: RateEntry<Bracket[]> = { value: INCOME_BRACKETS.value.map(b => ({ ...b, rate: b.rate / 10 })), basis: LOCAL_PERSONAL_BASIS };
export function corporateBrackets(small: boolean, local: boolean): RateEntry<Bracket[]> {
  const values: Bracket[] = small ? [{ upTo: 20_000_000_000, rate: 0.2 }, { upTo: 300_000_000_000, rate: 0.22 }, { upTo: null, rate: 0.25 }] : [{ upTo: 200_000_000, rate: 0.1 }, { upTo: 20_000_000_000, rate: 0.2 }, { upTo: 300_000_000_000, rate: 0.22 }, { upTo: null, rate: 0.25 }];
  return { value: local ? values.map(b => ({ ...b, rate: b.rate / 10 })) : values, basis: local ? LOCAL_CORP_BASIS : CORP_BASIS };
}
export const FINANCIAL_LIMIT: RateEntry<number> = { value: 20_000_000, basis: DIVIDEND_BASIS };
export const DIVIDEND_RATE: RateEntry<number> = { value: 0.14, basis: DIVIDEND_BASIS };
