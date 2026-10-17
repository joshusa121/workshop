import type { Basis } from "../sources";
import type { Bracket, RateEntry } from "../rates";
import { HOUSING_CONFIRMED_AT } from "./version";

function law(law: string, article: string, effectiveFrom: string, appliesTo: string): Basis {
  return { kind: "law", law, article, url: `https://www.law.go.kr/법령/${law.replace(/ /g, "")}/${article.split(" ")[0]}`, effectiveFrom, appliesTo, confirmedAt: HOUSING_CONFIRMED_AT };
}
// 법제처 Open API 본문 MST·조문별 확인 내역은 housing-tax-facts.md 참조.
export const ACQUISITION_BASIS = law("지방세법", "제11조 제1항 제8호", "2026-01-01", "2026년 일반주택 유상취득, 6억·9억 경계 및 중간 세율 반올림");
export const SURCHARGE_BASIS = law("지방세법", "제13조의2 제1항", "2026-01-01", "개인 다주택 유상취득. 법인·고급주택 및 중과제외 특례 제외");
export const TEMPORARY_BASIS = law("지방세법 시행령", "제28조의5", "2026-10-01", "일시적 2주택 요건을 확인한 경우. 종전·신규 모두 조정지역이면 처분기한 2년, 그 외 3년");
export const PROPERTY_BASIS = law("지방세법", "제110조", "2026-01-01", "주택별 공시가격 × 공정시장가액비율. 제3항 과세표준상한 미반영");
export const PROPERTY_SINGLE_BASIS = law("지방세법 시행령", "제110조의2", "2026-10-01", "세대별 주택 수·특례 판단 필요. 단순 1세대 1주택만 취급");
export const PROPERTY_RATIOS: RateEntry<{ general: number; single: { upTo: number | null; ratio: number }[] }> = {
  value: { general: .6, single: [{ upTo: 300_000_000, ratio: .43 }, { upTo: 600_000_000, ratio: .44 }, { upTo: null, ratio: .45 }] },
  basis: law("지방세법 시행령", "제109조 제1항 제2호", "2026-10-01", "2026년도 재산세. 1세대 1주택은 9억 초과도 45%"),
};
export const PROPERTY_BRACKETS: RateEntry<Bracket[]> = {
  value: [{ upTo: 60_000_000, rate: .001 }, { upTo: 150_000_000, rate: .0015 }, { upTo: 300_000_000, rate: .0025 }, { upTo: null, rate: .004 }],
  basis: law("지방세법", "제111조 제1항 제3호 나목", "2026-01-01", "일반 주택분 재산세 표준세율"),
};
export const PROPERTY_SINGLE_BRACKETS: RateEntry<Bracket[]> = {
  value: [{ upTo: 60_000_000, rate: .0005 }, { upTo: 150_000_000, rate: .001 }, { upTo: 300_000_000, rate: .002 }, { upTo: null, rate: .0035 }],
  basis: law("지방세법", "제111조의2", "2026-01-01", "공시가격 9억원 이하인 1세대 1주택. 부칙 제17769호 제2조 유효기간 내 2026년 납세분"),
};
export const URBAN_RATE: RateEntry<number> = { value: .0014, basis: law("지방세법", "제112조 제1항 제2호", "2026-01-01", "도시지역분 적용대상으로 고시된 주택. 조례 가감 미반영") };
export const EDUCATION_BASIS = law("지방세법", "제151조 제1항 제1호·제6호", "2026-01-01", "일반취득은 취득세율의 10%, 중과취득은 취득가액의 0.4%. 재산세 본세의 20%(도시지역분 제외)");
export const RURAL_BASIS = law("농어촌특별세법", "제5조 제1항 제6호·제8호", "2026-05-12", "취득 표준세율을 2%로 적용한 세액의 10%, 납부 종부세의 20%");
export const RURAL_EXEMPT_BASIS = law("농어촌특별세법 시행령", "제4조 제5항", "2026-01-02", "국민주택규모 이하 주거용 건물 및 기준면적 내 부수토지. 법 제4조 제11호 비과세 요건은 사용자 확인");
export const COMPREHENSIVE_DEDUCTION: RateEntry<{ single: number; general: number }> = {
  value: { single: 1_200_000_000, general: 900_000_000 }, basis: law("종합부동산세법", "제8조 제1항", "2026-01-01", "개인별 합산. 단순 1세대 1주택 12억, 일반 개인 9억"),
};
export const COMPREHENSIVE_SINGLE_BASIS = law("종합부동산세법 시행령", "제2조의3", "2026-10-01", "세대원 중 1명만 1주택을 소유하는 거주자. 부부 공동명의·특례 제외");
export const COMPREHENSIVE_RATIO: RateEntry<number> = { value: .6, basis: law("종합부동산세법 시행령", "제2조의4 제1항", "2026-10-01", "2026년 주택분 공정시장가액비율 60%") };
const comprehensiveTable = (rates: number[]): Bracket[] => [300_000_000, 600_000_000, 1_200_000_000, 2_500_000_000, 5_000_000_000, 9_400_000_000, null].map((upTo, i) => ({ upTo, rate: rates[i] }));
export const COMPREHENSIVE_BRACKETS: RateEntry<Bracket[]> = {
  value: comprehensiveTable([.005, .007, .01, .013, .015, .02, .027]), basis: law("종합부동산세법", "제9조 제1항 제1호", "2026-01-01", "개인 2주택 이하"),
};
export const COMPREHENSIVE_MULTI_BRACKETS: RateEntry<Bracket[]> = {
  value: comprehensiveTable([.005, .007, .01, .02, .03, .04, .05]), basis: law("종합부동산세법", "제9조 제1항 제2호", "2026-01-01", "개인 3주택 이상. 주택 수 제외 특례 미적용"),
};
export const PROPERTY_CREDIT_BASIS = law("종합부동산세법 시행령", "제4조의3 제1항", "2026-10-01", "재산세 본세 합계 × (종부 과표 × 재산세 일반 공정시장가액비율에 표준세율 적용액) / (공시가격 합계 × 일반 공정시장가액비율에 표준세율 적용액)");
export const PERSONAL_CREDIT: RateEntry<{ age: { from: number; rate: number }[]; years: { from: number; rate: number }[]; cap: number }> = {
  value: { age: [{ from: 70, rate: .4 }, { from: 65, rate: .3 }, { from: 60, rate: .2 }], years: [{ from: 15, rate: .5 }, { from: 10, rate: .4 }, { from: 5, rate: .2 }], cap: .8 },
  basis: law("종합부동산세법", "제9조 제5항·제6항·제8항", "2026-01-01", "1세대 1주택 과세기준일 나이·보유기간별 공제. 중복한도 80%"),
};
export const ROUND_BASIS = law("국고금 관리법", "제47조", "2026-01-02", "과표 1원 미만 버림, 납부세액 10원 미만 버림. 지방세 준용 및 분납 시 끝수는 Josh 감수");
export const ESTIMATE_BASIS: Basis = { kind: "assumption", description: "2026년 개인 거주자·일반주택 단독명의의 표준 계산. 재산세 과세표준상한·종부세 세부담상한, 조례 가감, 지역자원시설세 제외. 실제 고지서와 다를 수 있음. Josh 감수 필요", editable: true };
export const INPUT_BASIS: Basis = { kind: "assumption", description: "가격·세대 및 주택 수·고시지역·특례 적격 여부는 사용자가 확인하여 입력", editable: true };
