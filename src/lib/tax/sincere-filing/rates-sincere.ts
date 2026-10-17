import type { RateEntry } from "@/lib/tax/rates";
import type { Basis } from "@/lib/tax/sources";

function law(lawName: string, article: string, effectiveFrom: string, appliesTo: string): Basis {
  return { kind: "law", law: lawName, article, effectiveFrom, appliesTo, confirmedAt: "2026-10-17",
    url: `https://www.law.go.kr/법령/${encodeURIComponent(lawName)}/${encodeURIComponent(article.split("·")[0].split(" ")[0])}` };
}
export const SINCERE_BASIS = law("소득세법 시행령", "제133조 제1항·제2항", "2026-10-01", "2026 귀속 당해 수입, 사업용 유형자산 양도수입 제외; 겸업은 제208조 제7항 준용");
export const BOOK_BASIS = law("소득세법 시행령", "제208조 제5항·제7항", "2026-10-01", "직전 과세기간 수입 기준, 신규사업 및 간편장부 배제 예외");
export const SINCERE_THRESHOLDS: RateEntry<[number, number, number]> = { value: [1_500_000_000, 750_000_000, 500_000_000], basis: SINCERE_BASIS };
export const BOOK_THRESHOLDS: RateEntry<[number, number, number]> = { value: [300_000_000, 150_000_000, 75_000_000], basis: BOOK_BASIS };
export const CREDIT_RATE: RateEntry<number> = { value: 0.6, basis: law("조세특례제한법", "제126조의6 제1항", "2026-09-18", "개인 대상사업자가 확인서를 제출하면 직접 확인비용의 60%, 사업소득에 대한 소득세에서 공제") };
export const CREDIT_CAP: RateEntry<number> = { value: 1_200_000, basis: law("조세특례제한법 시행령", "제121조의6 제1항 제1호", "2026-09-18", "개인 성실신고확인대상사업자 공제 한도 120만원") };
export const DEADLINE_BASIS = law("소득세법", "제70조 제1항·제70조의2 제1항~제3항", "2026-01-01", "일반 다음해 5월 31일, 대상자가 확인서 제출 시 다음해 6월 30일; 제3항은 보정 요구");
export const GROUP_LABELS = ["도소매·농림어업·광업 등", "제조·숙박·음식·건설 등", "부동산임대·전문·교육·의료 등"] as const;
export const GROUP_DETAILS = [
  "상품중개업 제외 도소매, 부동산매매업, 그 밖의 사업. 비주거용 건물 건설업은 업종 확인이 필요합니다.",
  "제조, 숙박·음식, 전기·가스, 수도·폐기물, 주거용 건설·개발, 운수·창고, 정보통신, 금융·보험, 상품중개업.",
  "부동산임대·부동산업(부동산매매 제외), 전문·과학·기술, 사업지원·임대서비스, 교육, 보건·사회복지, 예술·스포츠, 수리·개인서비스 등.",
];
export const ASSUMPTIONS = [
  "거주자 개인사업자의 2026년 귀속 판정입니다. 수입금액은 순이익이 아니라 필요경비 차감 전 금액이며, 사업용 유형자산 양도 수입은 제외해 입력합니다.",
  "성실신고확인은 해당 연도, 복식부기는 직전 연도 수입으로 각각 판정합니다. 직전 여러 해의 평균을 쓰지 않습니다.",
  "같은 업종군의 모든 사업장 수입을 합산합니다. 공동사업장은 개인 단독사업과 단순 합산할 수 없어 Josh 감수가 필요합니다.",
  "시행령 별표 3의3 사업서비스업 특례, 업종 분류 불명확, 공동사업, 영세사업의 별도 간편장부 기준은 Josh 감수입니다. 해당하면 특수상황을 선택해 판정을 유보하세요.",
  "복식부기는 거래를 이중으로 기록하는 장부 방식입니다. 신규사업이라도 전문직·의료·약국 등 간편장부 배제 대상이면 복식부기입니다. 배제 여부는 세무사에게 확인하세요.",
  "확인비용 공제는 확인서 제출 및 직접 확인비용임을 전제로 한 계산상 한도입니다. 사업소득 관련 소득세 한도, 다른 공제와의 조정, 이월·추징·공제 배제는 계산하지 않아 실제 공제액은 Josh 감수가 필요합니다.",
  "신고기한은 법정 명목일입니다. 공휴일·기한연장·재난 특례는 반영하지 않습니다. 법인, 비거주자, 미제출 가산세는 다루지 않습니다.",
];
