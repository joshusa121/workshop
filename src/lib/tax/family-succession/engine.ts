import { applyBrackets } from "@/lib/tax/progressive";
import { floorWon } from "@/lib/tax/rounding";
import { traced, type Traced } from "@/lib/tax/trace";
import type { Basis } from "@/lib/tax/sources";
import { inputErrors, type Confirmation, type FamilySuccessionInput } from "./input";
import { GIFT_BASIS, GIFT_PARENT_AGE, GIFT_BRACKETS, GIFT_DECREE_BASIS, GIFT_DEDUCTION, INHERITANCE_BASIS, INHERITANCE_DECREE_BASIS, INPUT_BASIS, LIMITS, REQUIREMENTS, ROUNDING_BASIS } from "./rates";

export type RequirementCheck = { label: string; status: "pass" | "fail" | "review"; trace: Traced; unit: string };
export type FamilySuccessionResult = {
  status: "eligible" | "ineligible" | "review" | "invalid";
  errors: string[]; checks: RequirementCheck[];
  cap: Traced; eligibleValue: Traced; potentialBenefit: Traced; appliedDeduction: Traced; giftTaxBase: Traced; giftTax: Traced; outsideCap: Traced;
};
export function computeFamilySuccession(i: FamilySuccessionInput): FamilySuccessionResult {
  const gift = i.mode === "gift";
  const basis = gift ? GIFT_BASIS : INHERITANCE_BASIS;
  const decree = gift ? GIFT_DECREE_BASIS : INHERITANCE_DECREE_BASIS;
  const errors = inputErrors(i);
  const empty = (label: string) => traced(label, 0, ["입력값 오류로 계산하지 않습니다."], [basis]);
  if (errors.length) return { status: "invalid", errors, checks: [], cap: empty("한도"), eligibleValue: empty("대상 재산"), potentialBenefit: empty("잠정 금액"), appliedDeduction: empty("공제액"), giftTaxBase: empty("증여특례 과세표준"), giftTax: empty("증여특례 산출세액"), outsideCap: empty("한도 밖 금액") };
  const r = REQUIREMENTS.value;
  const checks: RequirementCheck[] = [];
  function add(label: string, state: boolean | Confirmation, value: number, unit: string, steps: string[], sources: Basis[] = [basis, decree]) {
    checks.push({ label, status: state === "unknown" ? "review" : state === true || state === "yes" ? "pass" : "fail", unit, trace: traced(label, value, steps, [...sources, INPUT_BASIS]) });
  }
  const confirm = (label: string, state: Confirmation, steps: string[], sources?: Basis[]) => add(label, state, state === "yes" ? 1 : 0, "확인", steps, sources);
  confirm("대상 기업·업종", i.enterprise, ["시행령상 업종·규모·독립성 등 기업요건을 별도로 확인한 응답입니다. 중소기업은 자산총액 5천억원 미만 요건도 확인하세요."]);
  confirm(gift ? "수증자 거주자 요건" : "피상속인 거주자 요건", i.resident, [gift ? "받는 자가 거주자인지 확인합니다. 부모로부터의 증여를 전제로 합니다." : "사망한 분이 거주자인지 확인합니다."]);
  add("계속 경영기간", i.businessYears >= r.businessYears, i.businessYears, "년", [`${r.businessYears}년 이상 계속 경영`, `입력 ${i.businessYears}년`]);
  if (i.companySize === "mid") {
    add("중견기업 평균 매출", i.averageRevenue < r.revenueExclusive, i.averageRevenue, "원", ["직전 3개 과세기간/사업연도 매출 평균이 5천억원 미만이어야 합니다."]);
    if (!gift) add("중견기업 납부능력", i.otherEstate / r.abilityMultiplier <= i.inheritanceTaxWithoutRelief, i.otherEstate, "원", ["해당 상속인의 가업 외 순상속재산이 공제 미적용 시 해당 상속인이 낼 상속세의 2배를 초과하면 제외", `가업 외 재산 ${i.otherEstate.toLocaleString()}원 ÷ 2 ≤ 상속세 ${i.inheritanceTaxWithoutRelief.toLocaleString()}원`]);
  }
  if (gift) {
    add("법인 주식·출자지분 증여", i.legalForm === "corporation", i.legalForm === "corporation" ? 1 : 0, "확인", ["개인사업 자산 자체의 증여는 이 특례 대상에 포함하지 않습니다."]);
    add("증여 부모 연령", i.ownerAge >= GIFT_PARENT_AGE.value, i.ownerAge, "세", [`부모 ${GIFT_PARENT_AGE.value}세 이상`]);
  }
  if (i.legalForm === "corporation") {
    confirm("최대주주와 특수관계인 범위", i.largestShareholder, ["단순 지분율만으로 최대주주를 판정하지 않습니다. 특수관계인 범위는 증빙 확인이 필요합니다."]);
    const share = i.listed ? r.listedShare : r.unlistedShare;
    add("가족 합산 지분", i.familySharePercent >= share, i.familySharePercent, "%", [`최대주주 및 특수관계인 합산 ${share}% 이상`, `입력 ${i.familySharePercent}%`]);
    add("지분 계속 보유기간", i.shareHoldingYears >= r.shareYears, i.shareHoldingYears, "년", [`정해진 지분을 ${r.shareYears}년 이상 계속 보유`]);
  }
  const normalRep = i.ownerRepresentativeYears >= i.businessYears * r.representativeFraction || i.ownerRepresentativeLastTen >= r.recentRepresentativeYears;
  const continuityAvailable = !gift && i.ownerRepresentativeYears >= r.representativeContinuityYears;
  const repState = normalRep ? true : continuityAvailable ? i.successorContinuous : false;
  add("경영자의 대표 재직기간", repState, i.ownerRepresentativeYears, "년", [
    "전체 경영기간의 50% 이상 또는 이전 10년 중 5년 이상 대표 재직",
    ...(!gift ? ["또는 대표로 10년 이상 재직하고 상속인이 그 직을 승계하여 상속개시일까지 계속 재직"] : []),
    `전체 대표 ${i.ownerRepresentativeYears}년 / 최근 10년 중 ${i.ownerRepresentativeLastTen}년`,
  ]);
  add("받는 사람 연령", i.recipientAge >= r.adultAge, i.recipientAge, "세", [`상속인 또는 수증자 ${r.adultAge}세 이상`]);
  if (!gift) {
    const workState = i.recipientWorkYears >= r.workYears || i.ownerAge < r.earlyDeathAge ? true : i.exceptionalDeath;
    add("상속 전 가업 종사", workState, i.recipientWorkYears, "년", [`경영기간 중 직접 ${r.workYears}년 이상 종사`, `${r.earlyDeathAge}세 이전 사망 또는 부득이한 사망 사유는 예외`, `사망 당시 연령 ${i.ownerAge}세`]);
  }
  confirm("종사·임원·대표 취임 일정", i.appointment, [gift
    ? "수증자 또는 배우자가 증여세 신고기한까지 가업에 종사하고 증여일부터 3년 이내 대표 취임"
    : "상속인 또는 배우자가 상속세 신고기한까지 임원 취임 및 신고기한부터 2년 이내 대표 취임"]);
  confirm("신청·배제 사유 확인", i.compliance, ["신고 때 증빙·특례 신청, 조세포탈·회계부정 형 확정 배제, 다른 최대주주로부터의 후속 승계 제한 등을 확인했다는 응답입니다. 증여는 창업자금 특례 중복 배제·복수 수증자 합산도 확인하세요."]);
  const status = checks.some(c => c.status === "fail") ? "ineligible" : checks.some(c => c.status === "review") ? "review" : "eligible";
  const capValue = LIMITS.value.find(l => i.businessYears >= l.years)?.cap ?? 0;
  const cap = traced("경영기간별 한도", capValue, [`계속 경영 ${i.businessYears}년`, "10년 이상 300억원 / 20년 이상 400억원 / 30년 이상 600억원"], [basis]);
  const eligibleValue = traced("확인한 가업 대상 재산", i.eligibleValue, ["사용자가 사업무관자산 등 제외 후 평가한 금액을 입력", "법인은 주식가액 × (총자산 − 사업무관자산) ÷ 총자산. 개인 상속은 직접 사용 사업용 자산 − 해당 자산 담보채무"], [decree, INHERITANCE_DECREE_BASIS, INPUT_BASIS]);
  const covered = Math.min(i.eligibleValue, capValue);
  const potentialBenefit = traced(gift ? "요건 충족 가정 시 특례 적용 과세가액" : "요건 충족 가정 시 상속공제액", covered, [`min(대상 재산 ${i.eligibleValue.toLocaleString()}원, 한도 ${capValue.toLocaleString()}원)`, "요건 미확인·미충족이면 실제 적용액이 아닙니다."], [basis, INPUT_BASIS]);
  const active = status === "eligible";
  const appliedDeduction = traced(gift ? "증여특례 공제액" : "상속공제액", active ? gift ? Math.min(covered, GIFT_DEDUCTION.value) : covered : 0,
    [active ? gift ? "특례 과세가액에서 최대 10억원 공제" : "가업 대상 재산과 경영기간별 한도 중 작은 금액" : "요건 미확인 또는 미충족이므로 적용 공제액을 표시하지 않습니다."], [basis]);
  const giftTaxBase = traced("증여특례 과세표준", active && gift ? Math.max(0, covered - GIFT_DEDUCTION.value) : 0, ["특례 적용 과세가액 − 10억원 (음수는 0)", "상속 방식 또는 특례 미적용 시 계산하지 않습니다."], [GIFT_BASIS]);
  const giftTax = applyBrackets(giftTaxBase.value, GIFT_BRACKETS, "증여특례 산출세액", floorWon);
  giftTax.basis.push(ROUNDING_BASIS);
  const outsideCap = traced("한도를 넘는 재산", Math.max(0, i.eligibleValue - capValue), ["대상 재산 − 기간별 한도 (음수는 0)", "증여 한도 초과분은 일반 증여세 별도 검토. 전체 납부세액에 포함하지 않았습니다."], [basis]);
  return { status, errors, checks, cap, eligibleValue, potentialBenefit, appliedDeduction, giftTaxBase, giftTax, outsideCap };
}
