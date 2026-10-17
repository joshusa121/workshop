import type { Basis } from "@/lib/tax/sources";
import type { Bracket, RateEntry } from "@/lib/tax/rates";

function law(name: string, article: string, appliesTo: string, effectiveFrom = "2026-07-01"): Extract<Basis, { kind: "law" }> {
  return { kind: "law", law: name, article, appliesTo, effectiveFrom,
    url: `https://www.law.go.kr/법령/${name.replace(/ /g, "")}/${article.split(" ")[0]}`,
    confirmedAt: "2026-10-17" };
}

// 법제처 OC=<OC키> 본문 XML: 법인세법 MST 280349 / 영 290843 / 조특법 284389.
export const BUSINESS_BASIS = law("법인세법", "제19조", "사업 관련 통상적 비용 또는 수익과 직접 관련된 비용");
export const INDIVIDUAL_BUSINESS_BASIS = law("소득세법", "제27조", "총수입금액에 대응하는 일반적으로 용인되는 통상적 비용");
export const CORP_PROOF_BASIS = law("법인세법", "제116조", "사업자로부터 재화·용역을 공급받는 경우의 지출증명");
export const INDIVIDUAL_PROOF_BASIS = law("소득세법", "제160조의2", "개인사업자의 지출증명 수취·보관");
export const PROOF_LIMIT: RateEntry<number> = { value: 30_000,
  basis: law("법인세법 시행령", "제158조", "부가가치세 포함 건당 거래금액 3만원 이하 예외", "2026-10-01") };
export const INDIVIDUAL_LIMIT_BASIS = law("소득세법 시행령", "제208조의2", "부가가치세 포함 거래건당 3만원 이하 예외", "2026-10-01");
export const ENTERTAINMENT: RateEntry<{ normal: number; sme: number; months: number }> = {
  value: { normal: 12_000_000, sme: 36_000_000, months: 12 },
  basis: law("법인세법", "제25조", "기본한도 × 사업연도 개월 수 / 12 + 수입금액별 한도. 증빙 부인액 먼저 제외"),
};
export const REVENUE_BRACKETS: RateEntry<Bracket[]> = { value: [
  { upTo: 10_000_000_000, rate: 0.003 }, { upTo: 50_000_000_000, rate: 0.002 }, { upTo: null, rate: 0.0003 },
], basis: ENTERTAINMENT.basis };
export const CULTURE: RateEntry<number> = { value: 0.2,
  basis: { ...law("조세특례제한법", "제136조", "문화비 및 전통시장·지역사랑상품권 각각 기본 총한도의 20% 범위 별도 손금", "2026-09-18"),
    sunset: "2028-12-31" } };
export const CAR: RateEntry<{ noLog: number; depreciation: number }> = {
  value: { noLog: 15_000_000, depreciation: 8_000_000 },
  basis: law("법인세법 시행령", "제50조의2", "전용보험·법정 번호판 요건, 운행기록 없는 비율 및 감가상각 한도. 연중 보유 일반법인만", "2026-10-01"),
};
export const CAR_DEPRECIATION_BASIS = law("법인세법", "제27조의2", "업무사용 감가상각 한도초과액 이월. 승용차별 적용");
export const DEPRECIATION_BASIS = law("법인세법", "제23조", "손비 계상 감가상각비 중 상각범위액 이내만 손금, 초과액은 후속 연도 검토");
export const METHOD_BASIS = law("법인세법 시행령", "제26조", "자산별 신고한 상각방법에 따른 상각범위액. 이 도구는 사용자가 검증한 범위액을 입력받음", "2026-10-01");
export const USER_BASIS: Basis = { kind: "assumption", description: "사용자가 입력한 금액·분류·충족 여부. 실제 거래·장부·세무요건과 일치하는지 Josh 감수 필요", editable: true };
export const ROUNDING_BASIS: Basis = { kind: "assumption", description: "검토 편의상 중간 계산의 원 미만을 버림. 신고서의 실제 단수 처리와 이월액은 Josh 감수 필요", editable: true };
