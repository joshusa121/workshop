import type { Basis } from "@/lib/tax/sources";

const confirmedAt = "2026-10-17";
function law(law: string, article: string, effectiveFrom: string, appliesTo: string): Basis {
  return { kind: "law", law, article, effectiveFrom, appliesTo, confirmedAt, url: `https://www.law.go.kr/법령/${law}/${article.split(" ")[0]}` };
}

/** 법제처 Open API XML 원문 대조. MST·확인 범위는 audit-risk-facts.md에 기록. */
export const LAW_BASES = {
  selection: law("국세기본법", "제81조의6 제2항·제3항", "2026-10-02", "정기선정 및 비정기 세무조사 사유. 이 도구의 등급·비율은 법정 기준이 아님"),
  rights: law("국세기본법", "제81조의2", "2026-10-02", "납세자권리헌장의 제정·교부"),
  notice: law("국세기본법", "제81조의7", "2026-10-02", "세무조사 통지와 연기신청. 사전통지 예외 있음"),
  sincere: law("소득세법", "제70조의2", "2026-07-01", "성실신고확인대상사업자의 확인서 제출. 대상 여부는 이 도구에서 계산하지 않음"),
  individualEvidence: law("소득세법", "제160조의2", "2026-07-01", "경비 지출증명 수취·보관. 법령상 예외는 개별 검토"),
  individualExpenses: law("소득세법", "제27조", "2026-07-01", "사업소득의 필요경비"),
  individualEntertainment: law("소득세법", "제35조", "2026-07-01", "기업업무추진비 필요경비 불산입. 한도초과액은 외부 확인값 입력"),
  corporationFiling: law("법인세법", "제60조", "2026-07-01", "내국법인의 과세표준 신고·첨부서류"),
  corporationEvidence: law("법인세법", "제116조", "2026-07-01", "법인의 지출증명 수취·보관. 법령상 예외는 개별 검토"),
  corporationExpenses: law("법인세법", "제19조", "2026-07-01", "법인의 손금 범위"),
  corporationEntertainment: law("법인세법", "제25조", "2026-07-01", "기업업무추진비 손금불산입. 한도초과액은 외부 확인값 입력"),
  ownerAdvance: law("법인세법", "제28조 제1항제4호나목", "2026-07-01", "업무무관 가지급금 관련 지급이자 제한. 적용 요건 및 금액 자동 계산 제외"),
  relatedParty: law("법인세법", "제52조", "2026-07-01", "특수관계인 거래의 부당행위계산 부인. 적용 여부 개별 확인"),
} satisfies Record<string, Basis>;

export const INPUT_BASIS: Basis = { kind: "assumption", editable: true, description: "사용자가 입력한 같은 기간의 금액·비율. 사실관계와 중복 여부는 Josh 감수 필요" };
export const REVIEW_POLICY: Basis = {
  kind: "assumption", editable: true,
  description: "도구의 검토 우선순위: 가공경비 의심·무자료 매입·의무 미이행이 하나라도 있으면 우선 검토. 나머지 징후는 자료 점검. 법정 위험점수·국세청 선정기준이 아니며 Josh 감수 필요",
};
