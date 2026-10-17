import type { Basis } from "@/lib/tax/sources";
import type { RateEntry } from "@/lib/tax/rates";
const law = (name: string, article: string, appliesTo: string, effectiveFrom: string): Basis => ({ kind: "law", law: name, article, url: `https://www.law.go.kr/법령/${name}/${article.split(" ")[0]}`, appliesTo, effectiveFrom, confirmedAt: "2026-10-17" });
export const BASIS = {
  filing: law("소득세법", "제70조 제4항", "확정신고 첨부서류. 복식부기의무자가 제3호 서류를 제출하지 않으면 무신고로 보는 규정 포함", "2026-01-01"),
  deductions: law("소득세법", "제70조 제4항 제1호", "공제 대상임을 증명하는 서류", "2026-01-01"),
  income: law("소득세법", "제70조 제4항 제2호", "총수입금액과 필요경비 계산에 필요한 서류", "2026-01-01"),
  books: law("소득세법", "제70조 제4항 제3호", "재무상태표·손익계산서와 부속서류·합계잔액시산표·조정계산서, 간편장부소득금액 계산서", "2026-01-01"),
  expenses: law("소득세법", "제70조 제4항 제4호", "제28조부터 제32조까지에 따라 필요경비에 산입한 경우의 명세서", "2026-01-01"),
  receipts: law("소득세법 시행령", "제132조 제3항·제4항", "거래건당 3만원 초과 비적격 영수증. 신규·직전 수입금액 4천800만원 미달·법 제73조 제1항 제4호 적용 사업자 제외", "2026-10-01"),
  estimate: law("소득세법", "제70조 제4항 제6호", "장부·증명서류에 의해 계산하지 않는 경우 추계소득금액 계산서", "2026-01-01"),
  sincere: law("소득세법", "제70조의2 제1항", "성실신고확인대상사업자는 제70조 첨부서류에 성실신고확인서 추가", "2026-01-01"),
  forms: law("소득세법 시행규칙", "제102조 제3항", "간편장부·추계 서식. 추계의 경우 해당 신고서 제출로 별도 계산서 제출을 갈음하는 경우 포함", "2026-05-22"),
  returnForm: law("소득세법 시행규칙", "제101조 제11호", "종합소득 과세표준확정신고 및 납부계산서", "2026-05-22"),
  family: law("소득세법 시행령", "제130조 제5항", "등본은 행정정보 공동이용으로 확인. 미동의 또는 부양가족 확인 불가 시 등본·가족관계등록부 증명서 첨부", "2026-10-01"),
};
// 계산에 사용하는 두 경계값. 비율이 아닌 금액이므로 단위는 원.
export const RECEIPT_LIMIT: RateEntry<number> = { value: 30_000, basis: BASIS.receipts };
export const SMALL_REVENUE_LIMIT: RateEntry<number> = { value: 48_000_000, basis: BASIS.receipts };
export const COUNT_BASIS: Basis = { kind: "assumption", description: "표시된 서류 묶음 개수입니다. 법정 서식 수나 제출의무 이행 판정이 아닙니다. 준비 상태는 사용자가 선택합니다.", editable: true };
