import { applyBrackets } from "../progressive";
import { floorWon, floorTenWon } from "../rounding";
import { traced, type Traced } from "../trace";
import type { Basis } from "../sources";
import { validateInput, type HousingInput } from "./input";
import * as R from "./rates";

function amount(label: string, value: number, step: string, basis: Basis[]): Traced {
  return traced(label, value, [step], [...basis, R.ESTIMATE_BASIS]);
}
function total(label: string, parts: Traced[]): Traced {
  return traced(label, parts.reduce((s, t) => s + t.value, 0), parts.length ? parts.map(t => `${t.label}: ${t.value.toLocaleString("ko-KR")}원`) : ["기준일에 보유한 주택이 없어 0원"], parts.length ? [...new Set(parts.flatMap(t => t.basis))] : [R.INPUT_BASIS, R.ESTIMATE_BASIS]);
}
const pct = (v: number) => `${Number((v * 100).toFixed(4))}%`;

export function computeHousing(input: HousingInput) {
  const errors = validateInput(input);
  if (errors.length) throw new Error(errors.join(" "));
  const { purchasePrice: price, acquisitionHomes: count } = input;
  const surcharge = !input.temporaryTwo && ((input.regulated && count >= 2) || (!input.regulated && count >= 3));
  const acquisitionRate = surcharge
    ? ((input.regulated && count >= 3) || count >= 4 ? .12 : .08)
    : price <= 600_000_000 ? .01 : price <= 900_000_000 ? Math.round((price * 2 - 900_000_000) / 30_000) / 1_000_000 : .03;
  const acquisitionBasis = [surcharge ? R.SURCHARGE_BASIS : R.ACQUISITION_BASIS, R.INPUT_BASIS, ...(input.temporaryTwo ? [R.TEMPORARY_BASIS] : [])];
  const acquisitionTax = amount("취득세", floorTenWon(price * acquisitionRate), `${price.toLocaleString("ko-KR")}원 × ${pct(acquisitionRate)} → 10원 미만 버림`, [...acquisitionBasis, R.ROUND_BASIS]);
  const educationRate = surcharge ? .004 : acquisitionRate * .1;
  const acquisitionEducation = amount("취득 지방교육세", floorTenWon(price * educationRate), `취득가액 × ${pct(educationRate)} → 10원 미만 버림`, [R.EDUCATION_BASIS, R.ROUND_BASIS]);
  // §5①6: 표준 2% + 중과기준세율 2%×200/400%에 농특세율 10% 적용.
  const ruralRate = input.ruralExempt ? 0 : surcharge ? acquisitionRate === .08 ? .006 : .01 : .002;
  const acquisitionRural = amount("취득 농어촌특별세", floorTenWon(price * ruralRate), input.ruralExempt ? "서민주택 비과세 요건 충족으로 입력 → 0원" : `취득가액 × ${pct(ruralRate)} → 10원 미만 버림`, [R.RURAL_BASIS, R.RURAL_EXEMPT_BASIS, R.INPUT_BASIS, R.ROUND_BASIS]);
  const acquisition = {
    count: amount("취득 직후 세대 주택 수", count, "사용자 입력. 취득세 주택 수 산정 및 제외 여부는 Josh 감수 필요", [R.INPUT_BASIS, R.SURCHARGE_BASIS]),
    price: amount("취득가액", price, "사용자가 입력한 유상취득 과세표준. 지분취득 제외", [R.INPUT_BASIS]),
    rate: amount("취득세율", acquisitionRate, surcharge ? `세대 ${count}주택·${input.regulated ? "조정" : "비조정"}지역 중과 ${pct(acquisitionRate)}` : "6억 이하 1%, 6억 초과 9억 이하 (취득가액/3억×2−3)%. % 단위 소수 넷째자리까지 반올림. 9억 초과 3%", acquisitionBasis),
    tax: acquisitionTax, education: acquisitionEducation, rural: acquisitionRural,
    total: total("취득 시 일회성 세금", [acquisitionTax, acquisitionEducation, acquisitionRural]),
  };

  const properties = input.homes.map((home, index) => {
    const ratio = input.householdSingle ? R.PROPERTY_RATIOS.value.single.find(b => b.upTo === null || home.publicValue <= b.upTo)!.ratio : R.PROPERTY_RATIOS.value.general;
    const base = floorWon(home.publicValue * ratio);
    const special = input.householdSingle && home.publicValue <= 900_000_000;
    const table = special ? R.PROPERTY_SINGLE_BRACKETS : R.PROPERTY_BRACKETS;
    const tax = applyBrackets(base, table, `주택 ${index + 1} 재산세 본세`, floorTenWon);
    tax.steps.push("과세표준상한·조례 감면 미반영, 연간 본세에서 10원 미만 버림");
    tax.basis.push(R.ROUND_BASIS, R.ESTIMATE_BASIS);
    const urban = amount("도시지역분", home.urban ? floorTenWon(base * R.URBAN_RATE.value) : 0, home.urban ? `과표 ${base.toLocaleString("ko-KR")}원 × ${pct(R.URBAN_RATE.value)}` : "도시지역분 비대상으로 입력 → 0원", [R.URBAN_RATE.basis, R.INPUT_BASIS, R.ROUND_BASIS]);
    const education = amount("재산 지방교육세", floorTenWon(tax.value * .2), "재산세 본세 × 20%, 도시지역분 제외. 10원 미만 버림", [R.EDUCATION_BASIS, R.ROUND_BASIS]);
    return {
      publicValue: amount("주택 공시가격", home.publicValue, "사용자 입력: 2026년 과세기준일 보유주택의 전체 공시가격", [R.INPUT_BASIS]),
      ratio: amount("재산세 공정시장가액비율", ratio, input.householdSingle ? "1세대 1주택: 공시 3억 이하 43%, 6억 이하 44%, 초과 45%" : "일반주택 60%", [R.PROPERTY_RATIOS.basis, R.PROPERTY_SINGLE_BASIS]),
      base: amount("재산세 과세표준", base, `공시가격 × ${pct(ratio)} → 1원 미만 버림. 과표상한 미반영`, [R.PROPERTY_BASIS, R.PROPERTY_RATIOS.basis, R.ROUND_BASIS]),
      tax, urban, education, total: total(`주택 ${index + 1} 재산 관련 세금`, [tax, urban, education]),
    };
  });
  const propertyTotal = total("재산 관련 세금 합계", properties.map(p => p.total));
  const publicSum = input.homes.reduce((s, h) => s + h.publicValue, 0);
  const deduction = input.householdSingle ? R.COMPREHENSIVE_DEDUCTION.value.single : R.COMPREHENSIVE_DEDUCTION.value.general;
  const comprehensiveBase = floorWon(Math.max(0, publicSum - deduction) * R.COMPREHENSIVE_RATIO.value);
  const gross = applyBrackets(comprehensiveBase, input.homes.length >= 3 ? R.COMPREHENSIVE_MULTI_BRACKETS : R.COMPREHENSIVE_BRACKETS, "종부세 공제 전 산출세액", floorWon);
  if (!gross.steps.length) gross.steps.push("종부세 과세표준이 0원이므로 산출세액 0원");
  gross.basis.push(R.ESTIMATE_BASIS);
  const propertyPaid = properties.reduce((s, p) => s + p.tax.value, 0);
  const denominator = applyBrackets(publicSum * R.PROPERTY_RATIOS.value.general, R.PROPERTY_BRACKETS, "분모", n => n).value;
  const numerator = applyBrackets(comprehensiveBase * R.PROPERTY_RATIOS.value.general, R.PROPERTY_BRACKETS, "분자", n => n).value;
  const propertyCredit = Math.min(gross.value, denominator > 0 ? floorWon(propertyPaid * numerator / denominator) : 0);
  const ageRate = input.householdSingle ? (R.PERSONAL_CREDIT.value.age.find(b => input.age >= b.from)?.rate ?? 0) : 0;
  const holdRate = input.householdSingle ? (R.PERSONAL_CREDIT.value.years.find(b => input.holdingYears >= b.from)?.rate ?? 0) : 0;
  const creditRate = Math.min(R.PERSONAL_CREDIT.value.cap, ageRate + holdRate);
  const personalCredit = floorWon((gross.value - propertyCredit) * creditRate);
  const comprehensiveTax = amount("종합부동산세 (상한 전)", floorTenWon(gross.value - propertyCredit - personalCredit), "산출세액 − 재산세 중복분 공제 − 고령·장기보유 공제 → 10원 미만 버림. 세부담상한 미반영", [R.COMPREHENSIVE_BRACKETS.basis, R.PROPERTY_CREDIT_BASIS, R.PERSONAL_CREDIT.basis, R.ROUND_BASIS]);
  const comprehensiveRural = amount("종부 농어촌특별세", floorTenWon(comprehensiveTax.value * .2), "종부세 × 20% → 10원 미만 버림. 종부세 상한 미반영에 따른 추정액", [R.RURAL_BASIS, R.ROUND_BASIS]);
  const comprehensive = {
    age: amount("과세기준일 만 나이", input.age, "사용자가 입력한 2026년 6월 1일의 만 나이", [R.INPUT_BASIS, R.PERSONAL_CREDIT.basis]),
    holdingYears: amount("과세기준일 보유연수", input.holdingYears, "사용자가 입력한 과세기준일까지 채운 보유연수. 특례 기산은 Josh 감수 필요", [R.INPUT_BASIS, R.PERSONAL_CREDIT.basis]),
    publicSum: amount("본인 공시가격 합계", publicSum, "과세기준일 보유주택을 납세의무자별로 합산. 단독명의만 취급", [R.COMPREHENSIVE_DEDUCTION.basis, R.INPUT_BASIS]),
    deduction: amount("종부세 기본공제", deduction, input.householdSingle ? "거주자·세대원 중 1명만 1주택 보유: 12억원" : "일반 개인별 공제: 9억원", [R.COMPREHENSIVE_DEDUCTION.basis, R.COMPREHENSIVE_SINGLE_BASIS]),
    ratio: amount("종부세 공정시장가액비율", R.COMPREHENSIVE_RATIO.value, "주택분 60%", [R.COMPREHENSIVE_RATIO.basis]),
    base: amount("종부세 과세표준", comprehensiveBase, "max(0, 본인 공시가격 합계 − 기본공제) × 60% → 1원 미만 버림", [R.COMPREHENSIVE_DEDUCTION.basis, R.COMPREHENSIVE_RATIO.basis, R.ROUND_BASIS]),
    gross,
    propertyCredit: amount("재산세 중복분 공제", propertyCredit, `재산세 본세 합계 ${propertyPaid.toLocaleString("ko-KR")} × 분자 ${numerator.toLocaleString("ko-KR")} / 분모 ${denominator.toLocaleString("ko-KR")} (분모 0이면 공제 0). 1원 미만 버림, 산출세액 한도`, [R.PROPERTY_CREDIT_BASIS, R.PROPERTY_BRACKETS.basis, R.ESTIMATE_BASIS]),
    ageRate: amount("고령자 공제율", ageRate, `기준일 만 ${input.age}세. 1세대 1주택만 60세20%·65세30%·70세40%`, [R.PERSONAL_CREDIT.basis]),
    holdRate: amount("장기보유 공제율", holdRate, `기준일 보유 ${input.holdingYears}년. 1세대 1주택만 5년20%·10년40%·15년50%`, [R.PERSONAL_CREDIT.basis]),
    creditRate: amount("합산 공제율", creditRate, `${pct(ageRate)} + ${pct(holdRate)}, 합계 80% 한도`, [R.PERSONAL_CREDIT.basis]),
    personalCredit: amount("고령·장기보유 세액공제", personalCredit, `(산출세액 − 재산세 중복분 공제) × ${pct(creditRate)} → 1원 미만 버림`, [R.PERSONAL_CREDIT.basis, R.ROUND_BASIS]),
    tax: comprehensiveTax, rural: comprehensiveRural,
    total: total("종부 관련 세금 합계", [comprehensiveTax, comprehensiveRural]),
  };
  const review = ["Josh 감수 필요: 세대·주택 수, 취득세 중과 제외, 조정대상지역 해당 여부, 농특세 비과세 요건을 확인하세요.", "Josh 감수 필요: 재산세 과세표준상한과 종부세 세부담상한을 반영하지 않은 표준 추정치입니다. 재산세 중복공제도 상한 전 본세로 추정합니다.", "Josh 감수 필요: 지방세 끝수 준용·재산세 분납 및 고지서별 끝수 차이는 실제 고지서로 확인하세요."];
  if (input.temporaryTwo) review.push("Josh 감수 필요: 일시적 2주택 취득세 특례를 요건 충족으로 가정했습니다. 종전·신규 모두 조정지역이면 처분기한 2년, 그 외 3년(현행 영 제28조의5). 기간 미준수 시 추징될 수 있습니다. 보유세 특례는 별도입니다.");
  return { acquisition, properties, propertyTotal, comprehensive, annual: total("보유 시 연간 세금 (상한 전)", [propertyTotal, comprehensive.total]), review };
}
export type HousingResult = ReturnType<typeof computeHousing>;
