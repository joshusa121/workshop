import type { Basis } from "@/lib/tax/sources";
import { CONFIRMED_AT } from "./version";

function law(name: string, article: string, effectiveFrom: string, appliesTo: string): Basis {
  return { kind: "law", law: name, article, url: `https://www.law.go.kr/법령/${name}/${article.split(" ")[0]}`,
    effectiveFrom, appliesTo, confirmedAt: CONFIRMED_AT };
}

/** 법제처 Open API XML 본문으로 확정. 시행일은 해당 조문의 조문시행일자. */
export const BASIS = {
  vatPeriod: law("부가가치세법", "제5조 제1항", "2026-01-02", "일반 반기·간이 연간 과세기간"),
  vatAdvance: law("부가가치세법", "제48조 제1항~제4항", "2026-01-02", "예정신고기간 종료 후 25일, 개인·고지 대상 법인은 예정고지 및 예외 확인"),
  vatFinal: law("부가가치세법", "제49조 제1항·제2항", "2026-01-02", "과세기간 종료 후 25일 이내 확정신고·납부"),
  vatSimple: law("부가가치세법", "제67조 제1항", "2026-01-02", "간이과세자 과세기간 종료 후 25일 이내 확정신고·납부"),
  vatSimpleJuly: law("부가가치세법", "제66조 제1항~제5항", "2026-01-02", "예정부과기간 종료 후 25일 이내, 징수 제외·세금계산서 발급 등 별도 확인"),
  income: law("소득세법", "제70조 제1항", "2026-01-01", "다음 연도 5월 1일부터 5월 31일까지 신고"),
  sincere: law("소득세법", "제70조의2 제2항", "2026-01-01", "성실신고확인서 제출 시 다음 연도 6월 30일까지 신고"),
  incomePayment: law("소득세법", "제76조 제1항", "2026-01-01", "확정신고기한까지 납부"),
  withholding: law("소득세법", "제128조 제1항", "2026-01-01", "징수월의 다음 달 10일까지 납부"),
  semiannual: law("소득세법", "제128조 제2항", "2026-01-01", "적용 가능한 원천세는 징수 반기의 마지막 달의 다음 달 10일까지 납부"),
  payroll: law("소득세법", "제137조 제1항", "2026-01-01", "계속 근로자 연말정산은 다음 연도 2월분 근로소득 지급 시"),
  property: law("지방세법", "제115조 제1항", "2026-01-01", "건축물 7월·토지 9월·주택 7월 및 9월, 각 16일부터 말일까지. 주택 일괄부과는 조례 확인"),
  comprehensiveProperty: law("종합부동산세법", "제16조 제1항·제3항·제4항", "2026-01-01", "12월 1일부터 12월 15일까지 부과·징수, 신고납부 선택 가능"),
  corporation: law("법인세법", "제60조 제1항", "2026-01-01", "사업연도 종료월 말일부터 3개월, 성실신고확인서 제출 시 4개월 이내"),
  corporationPayment: law("법인세법", "제64조 제1항", "2026-01-01", "법인세 신고기한까지 납부"),
} satisfies Record<string, Basis>;

export const DEADLINES = { vatDays: 25, withholdingDay: 10, incomeMonth: 5, sincereMonth: 6,
  corpMonths: 3, sincereCorpMonths: 4, propertyStart: 16, comprehensiveStart: 1, comprehensiveEnd: 15 } as const;
