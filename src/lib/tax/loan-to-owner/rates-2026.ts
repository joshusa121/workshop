import type { Bracket, RateEntry } from "@/lib/tax/rates";
import type { Basis } from "@/lib/tax/sources";

function law(law: string, article: string, effectiveFrom: string, appliesTo: string): Basis {
  return { kind: "law", law, article,
    url: `https://www.law.go.kr/법령/${encodeURIComponent(law)}/${encodeURIComponent(article.split(" ")[0].split("·")[0])}`,
    effectiveFrom, appliesTo, confirmedAt: "2026-10-17" };
}
export const RECOGNITION_BASIS = law("법인세법·시행령", "법 제52조·영 제88조 제1항 제6호·제3항, 제89조 제3항·제5항", "2026-10-01", "특수관계인에게 무상·저리로 대여한 단일 금전 거래. 적용 여부 Josh 감수 필요");
export const DISALLOWANCE_BASIS = law("법인세법 시행령", "제53조 제1항~제3항 (법 제28조 제1항 제4호 나목)", "2026-10-01", "업무무관 가지급금 적수 / 총차입금 적수, 총차입금 한도. 동일인 가수금 상계·제외 차입금은 입력 전 검토");
export const WEIGHTED_BASIS = law("법인세법 시행령·시행규칙", "영 제89조 제3항 본문·규칙 제43조 제1항", "2026-07-01", "대여시점의 비특수관계인 차입금 잔액과 이자율로 산정한 가중평균차입이자율");
export const OVERDRAFT_RATE: RateEntry<number> = {
  value: 0.046,
  basis: law("법인세법 시행규칙", "제43조 제2항~제5항 (영 제89조 제3항)", "2026-07-01", "당좌대출이자율 연 1,000분의 46. 적용 사유 또는 신고 선택·구속기간 확인 필요"),
};
export const DIFFERENCE_THRESHOLD: RateEntry<{ amount: number; ratio: number }> = {
  value: { amount: 300_000_000, ratio: 0.05 }, basis: RECOGNITION_BASIS,
};
export const CORP_BRACKETS: RateEntry<Bracket[]> = {
  value: [{ upTo: 200_000_000, rate: 0.1 }, { upTo: 20_000_000_000, rate: 0.2 }, { upTo: 300_000_000_000, rate: 0.22 }, { upTo: null, rate: 0.25 }],
  basis: law("법인세법", "제55조 제1항 제1호", "2026-01-01", "2026년 개시 12개월 일반 내국법인. 제60조의2 제1항 제1호 해당 법인 제외"),
};
export const LOCAL_BRACKETS: RateEntry<Bracket[]> = {
  value: [{ upTo: 200_000_000, rate: 0.01 }, { upTo: 20_000_000_000, rate: 0.02 }, { upTo: 300_000_000_000, rate: 0.022 }, { upTo: null, rate: 0.025 }],
  basis: law("지방세법", "제103조의19 제1항·제103조의20 제1항 제1호·제2항", "2026-01-01", "법인세와 동일 과세표준, 일반 내국법인 표준세율. 조례 가감 미반영"),
};
export const DISPOSITION_BASIS = law("법인세법 시행령", "제106조 제1항 제1호 가·나목 및 제3호 마목", "2026-10-01", "사외유출 및 귀속자 확정 전제. 임원·직원은 상여, 그 외 주주는 배당. 지급이자 부인은 기타 사외유출");
export const SALARY_BASIS = law("소득세법", "제20조 제1항 제3호", "2026-01-01", "법인세법에 따라 상여로 처분된 금액은 근로소득");
export const DIVIDEND_BASIS = law("소득세법", "제17조 제1항 제4호", "2026-01-01", "법인세법에 따라 배당으로 처분된 금액은 배당소득");
export const CALCULATION_ASSUMPTION: Basis = { kind: "assumption", editable: true,
  description: "2026년 평년·12개월 사업연도. 기간별 잔액은 겹치지 않는 일수로 입력. 365일 나눔, 계산금액은 원 미만 절사하는 진단 가정(신고 끝수·일수 산정 Josh 감수 필요)." };
export const INPUT_ASSUMPTION: Basis = { kind: "assumption", editable: true,
  description: "입력한 잔액·실제 이자·차입금·지급이자·과세표준. 동일 개인에 대한 단일 업무무관 대여, 정상 이자와 수취액 모두 미수이자 등 세무조정 전제 확인 필요." };
