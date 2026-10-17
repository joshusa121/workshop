import type { RateEntry } from "@/lib/tax/rates";
import type { Basis } from "@/lib/tax/sources";
import { WITHHOLDING_CONFIRMED_AT } from "./version";

export function lawBasis(law: string, article: string, appliesTo: string, effectiveFrom = "2026-01-01"): Basis {
  return {
    kind: "law", law, article,
    url: `https://www.law.go.kr/법령/${law.replaceAll(" ", "")}/${article.split(" ")[0]}`,
    effectiveFrom, appliesTo, confirmedAt: WITHHOLDING_CONFIRMED_AT,
  };
}
export const DUTY_BASIS = lawBasis("소득세법", "제127조 제1항", "국내에서 거주자에게 소득을 지급하는 원천징수의무자");
export const BUSINESS_SCOPE_BASIS = lawBasis("소득세법 시행령", "제184조 제1항·제3항", "계속·반복적 면세 인적용역을 지급하는 사업자 등", "2026-10-01");
export const DEADLINE_BASIS = lawBasis("소득세법", "제128조 제1항·제2항", "다음 달 또는 승인·지정된 반기 마지막 달의 다음 달 10일. 법정 기준일");
export const HALF_YEAR_BASIS = lawBasis("소득세법 시행령", "제186조 제1항", "반기납부는 요건을 충족하고 승인 또는 지정을 받은 경우에만 적용", "2026-10-01");
export const NATIONAL_RATES: Record<"business" | "other" | "interest" | "dividend", RateEntry<number>> = {
  business: { value: 3, basis: lawBasis("소득세법", "제129조 제1항 제3호", "원천징수대상 사업소득 3%. 외국인 직업운동가 제외") },
  other: { value: 20, basis: lawBasis("소득세법", "제129조 제1항 제6호 라목", "일시적 인적용역·경쟁대회 상금·사례금 기타소득 20%") },
  interest: { value: 14, basis: lawBasis("소득세법", "제129조 제1항 제1호 라목", "일반 이자 14%. 비영업대금·직장공제회 등 제외") },
  dividend: { value: 14, basis: lawBasis("소득세법", "제129조 제1항 제2호 나목", "일반 배당 14%. 출자공동사업자·특례 배당 제외") },
};
export const EXPENSE_RATES: Record<"lecture" | "prize" | "reward", RateEntry<number>> = {
  lecture: { value: 60, basis: lawBasis("소득세법 시행령", "제87조 제1호의2", "소득세법 제21조제1항제19호 일시적 인적용역 60%, 실제 경비가 더 크면 그 금액", "2026-10-01") },
  prize: { value: 80, basis: lawBasis("소득세법 시행령", "제87조 제1호 가목", "다수가 순위 경쟁하는 대회의 입상 상금·부상 80%, 실제 경비가 더 크면 그 금액", "2026-10-01") },
  reward: { value: 0, basis: lawBasis("소득세법", "제37조 제2항", "제21조제1항제17호 사례금: 정률 경비 없이 실제 통상 경비만 반영") },
};
export const LOCAL_RATE: RateEntry<number> = {
  value: 10, basis: lawBasis("지방세법", "제103조의13 제1항·제2항", "원천징수하는 소득세의 10%, 소득세와 동시에 특별징수. 같은 납부 기준일"),
};
export const OTHER_MINIMUM: RateEntry<number> = {
  value: 50_000, basis: lawBasis("소득세법", "제84조 제4호", "이 계산기의 기타소득금액이 건별 5만원 이하이면 과세하지 않음"),
};
export const SMALL_TAX: RateEntry<number> = {
  value: 1_000, basis: lawBasis("소득세법", "제86조 제1호", "원천징수세액 1천원 미만 부징수. 이자·시행령상 인적용역 사업소득 제외"),
};
export const SMALL_EXCEPTION_BASIS = lawBasis("소득세법 시행령", "제149조의3", "계속·반복적 면세 인적용역 사업소득은 소액부징수 예외", "2026-10-01");
export const ROUNDING_BASIS = lawBasis("국고금 관리법", "제47조 제1항·제2항", "세금 계산 기준금액 1원 미만 버림, 국고금 수입 10원 미만 버림", "2026-01-02");
export const LOCAL_ROUNDING_BASIS = lawBasis("지방회계법", "제55조", "지방소득세 10원 미만 버림 방식 적용", "2026-01-02");
export const INPUT_BASIS: Basis = { kind: "assumption", description: "사용자가 입력한 국내 거주자 개인에 대한 한 계약·지급 원인별 세전 지급액과 실제 경비", editable: true };
