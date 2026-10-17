import type { Basis } from "@/lib/tax/sources";
import type { Bracket, RateEntry } from "@/lib/tax/rates";

function law(law: string, article: string, effectiveFrom: string, appliesTo: string): Basis {
  return { kind: "law", law, article, effectiveFrom, appliesTo,
    url: `https://www.law.go.kr/법령/${law.replaceAll(" ", "")}/${article.split(" ")[0]}`,
    confirmedAt: "2026-10-17" };
}
export const INHERITANCE_BASIS = law("상속세 및 증여세법", "제18조의2", "2026-01-02", "가업상속공제 한도·경영기간·중견기업 납부능력·사후관리");
export const INHERITANCE_DECREE_BASIS = law("상속세 및 증여세법 시행령", "제15조", "2026-10-01", "기업·피상속인·상속인 요건과 가업상속재산 평가");
export const GIFT_BASIS = law("조세특례제한법", "제30조의6", "2026-09-18", "가업 주식 증여특례의 연령·한도·공제·세율·사후관리");
export const GIFT_DECREE_BASIS = law("조세특례제한법 시행령", "제27조의6", "2026-09-18", "증여자 대표 재직·수증자 종사 및 대표 취임·가업자산상당액");
export const LIMITS: RateEntry<{ years: number; cap: number }[]> = {
  value: [{ years: 30, cap: 60_000_000_000 }, { years: 20, cap: 40_000_000_000 }, { years: 10, cap: 30_000_000_000 }], basis: INHERITANCE_BASIS,
};
export const REQUIREMENTS: RateEntry<{
  businessYears: number; shareYears: number; unlistedShare: number; listedShare: number;
  representativeFraction: number; recentRepresentativeYears: number; representativeContinuityYears: number;
  adultAge: number; workYears: number; earlyDeathAge: number;
  revenueExclusive: number; abilityMultiplier: number;
}> = { value: { businessYears: 10, shareYears: 10, unlistedShare: 40, listedShare: 20,
  representativeFraction: 0.5, recentRepresentativeYears: 5, representativeContinuityYears: 10,
  adultAge: 18, workYears: 2, earlyDeathAge: 65,
  revenueExclusive: 500_000_000_000, abilityMultiplier: 2 }, basis: INHERITANCE_DECREE_BASIS };
export const GIFT_PARENT_AGE: RateEntry<number> = { value: 60, basis: GIFT_BASIS };
export const GIFT_DEDUCTION: RateEntry<number> = { value: 1_000_000_000, basis: GIFT_BASIS };
export const GIFT_BRACKETS: RateEntry<Bracket[]> = {
  value: [{ upTo: 12_000_000_000, rate: 0.1 }, { upTo: null, rate: 0.2 }], basis: GIFT_BASIS,
};
export const INPUT_BASIS: Basis = { kind: "assumption", description: "입력값은 사용자가 확인한 가정이며 증빙을 자동 검증하지 않습니다.", editable: true };
export const ROUNDING_BASIS: Basis = { kind: "assumption", description: "증여특례 산출세액은 원 미만 버림으로 표시합니다. 납부세액 끝수·세액공제·가산세는 계산하지 않습니다.", editable: true };

export const AFTERCARE = {
  inheritance: [
    "상속개시일부터 5년 이내 정당한 사유 없이 가업용 자산을 40% 이상 처분하면 추징 대상입니다.",
    "상속 후 5년 동안 가업 종사와 지분을 유지해야 합니다. 휴·폐업·업종 변경 등 상세 판정은 Josh 감수 필요입니다.",
    "5년간 정규직 수 평균과 총급여 평균이 각각 직전 2년 평균의 90%에 모두 미달하면 추징 대상입니다. 둘 중 하나를 유지하면 해당 고용 요건의 추징 사유에는 해당하지 않습니다.",
  ],
  gift: [
    "증여세 신고기한까지 수증자 또는 배우자가 가업에 종사하고 증여일부터 3년 이내 대표이사에 취임해야 합니다.",
    "증여일부터 5년까지 대표이사직을 유지해야 하며, 정당한 사유 없는 휴·폐업·지분 감소 등은 추징 대상입니다.",
    "증여특례에는 상속공제의 자산 40%·고용 90% 요건을 그대로 적용하지 않습니다. 업종 변경·지분 감소의 예외는 Josh 감수 필요입니다.",
  ],
} as const;
