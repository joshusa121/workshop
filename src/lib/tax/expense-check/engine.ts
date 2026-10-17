import { applyBrackets } from "@/lib/tax/progressive";
import { floorWon } from "@/lib/tax/rounding";
import { traced, type Traced } from "@/lib/tax/trace";
import type { Basis } from "@/lib/tax/sources";
import { validateInput, type ExpenseInput } from "./input";
import { BUSINESS_BASIS, CAR, CAR_DEPRECIATION_BASIS, CORP_PROOF_BASIS, CULTURE, DEPRECIATION_BASIS,
  ENTERTAINMENT, INDIVIDUAL_BUSINESS_BASIS, INDIVIDUAL_LIMIT_BASIS, INDIVIDUAL_PROOF_BASIS, METHOD_BASIS, PROOF_LIMIT, REVENUE_BRACKETS, ROUNDING_BASIS, USER_BASIS } from "./rates";

export type ExpenseResult = {
  verdict: "조건부 처리 가능" | "한도 초과" | "처리 불가" | "Josh 감수";
  amount: Traced;
  allowed: Traced | null;
  excluded: Traced | null;
  deferred: Traced | null;
  limit: Traced | null;
  details: Traced[];
  reasons: string[];
  review: string[];
};

export function computeExpense(i: ExpenseInput): ExpenseResult {
  const errors = validateInput(i);
  if (errors.length) throw new Error(errors.join(" "));
  const r: ExpenseResult = { verdict: "Josh 감수", amount: traced("입력 금액", i.amount, ["사용자 입력"], [USER_BASIS]),
    allowed: null, excluded: null, deferred: null, limit: null, details: [], reasons: [],
    review: ["사업 관련성·거래 실재·비용 분류와 각 특례 요건은 Josh 감수 필요. 신고 확정액이 아닙니다."] };
  function finish(allowed: number, steps: string[], basis: Basis[], deferred = 0) {
    const a = floorWon(allowed);
    r.allowed = traced("당기 비용 인정 검토액", a, steps, [...basis, USER_BASIS, ROUNDING_BASIS]);
    r.excluded = traced("당기 비용 미반영액", i.amount - a, ["입력 금액 − 당기 비용 인정 검토액. 이월 검토액 포함"], [...basis, USER_BASIS]);
    r.deferred = traced("후속 연도 이월 검토액", deferred, ["당기 미반영액 중 상각 한도초과분. 다음 연도 공제 확정액은 아님"], [...basis, USER_BASIS]);
    r.verdict = a === 0 && i.amount > 0 ? "처리 불가" : a < i.amount ? "한도 초과" : "조건부 처리 가능";
    return r;
  }
  if (!i.businessUse) {
    if (i.entity === "individual") { r.reasons.push("사업과 무관한 지출입니다. 개인사업자 필요경비 여부는 Josh 감수 후 확정합니다."); return r; }
    r.reasons.push("사업 관련 비용이라는 전제를 충족하지 못했습니다.");
    return finish(0, ["사업 관련성이 없어 비용 인정 검토액 0원"], [BUSINESS_BASIS]);
  }
  if (i.category === "general") {
    const proof = i.entity === "corp" ? CORP_PROOF_BASIS : INDIVIDUAL_PROOF_BASIS;
    const threshold = i.entity === "corp" ? PROOF_LIMIT.basis : INDIVIDUAL_LIMIT_BASIS;
    r.limit = traced("적격증빙 수취 의무의 소액 예외 경계", PROOF_LIMIT.value, ["부가가치세 포함 건당 거래금액 기준"], [threshold]);
    if (i.evidence === "none" || (i.evidence === "receipt" && i.amount > PROOF_LIMIT.value)) {
      r.reasons.push("지출사실을 입증할 자료 또는 적격증빙을 보완해야 합니다. 증빙 누락만으로 비용 전액 부인을 자동 판정하지 않습니다.");
      return r;
    }
    r.reasons.push("사업 관련 통상적 일반 지출이며 거래 실재를 입증할 자료가 있다는 입력 전제입니다. 자산 취득·접대비는 해당 항목에서 따로 검토하세요.");
    return finish(i.amount, ["적격증빙 수취 또는 소액 예외 + 실제 지출자료 보관을 전제로 전액 검토"], [proof, threshold, i.entity === "corp" ? BUSINESS_BASIS : INDIVIDUAL_BUSINESS_BASIS]);
  }
  if (i.entity === "individual") {
    r.reasons.push("이 항목의 한도 엔진은 법인 기준입니다. 개인사업자의 별도 법령 요건은 Josh 감수 후 적용합니다.");
    return r;
  }
  if (i.specialCorp && (i.category === "car" || i.category === "entertainment")) {
    r.reasons.push("부동산임대 주업 등 특수 법인·정부출자기관은 축소 한도 적용 여부를 Josh 감수해야 합니다."); return r;
  }
  if (i.category === "entertainment") {
    if (i.relatedRevenue) { r.reasons.push("특수관계인 매출의 별도 한도 계산은 Josh 감수 필요. 일반 매출만으로 대체 계산하지 않습니다."); return r; }
    const base = floorWon((i.sme ? ENTERTAINMENT.value.sme : ENTERTAINMENT.value.normal) * i.months / ENTERTAINMENT.value.months);
    const sales = applyBrackets(i.revenue, REVENUE_BRACKETS, "매출에 따른 추가한도", floorWon);
    const ordinaryLimit = base + sales.value;
    const extraCap = floorWon(ordinaryLimit * CULTURE.value);
    // 문화와 시장은 중복 없이 입력. 같은 지출을 두 특례에 중복 사용하지 않는다.
    const culture = Math.min(i.culture, extraCap), market = Math.min(i.market, extraCap);
    const limit = ordinaryLimit + culture + market;
    r.details = [traced("사업연도 기본한도", base, ["중소기업 여부에 따른 연 기본한도 × 사업연도 개월 수 / 12"], [ENTERTAINMENT.basis, USER_BASIS]), sales,
      traced("문화비 별도 인정분", culture, ["min(입력한 적격 문화비, 일반 총한도 × 20%)"], [CULTURE.basis, USER_BASIS]),
      traced("시장·상품권 별도 인정분", market, ["min(입력한 적격 시장·상품권 지출, 일반 총한도 × 20%)"], [CULTURE.basis, USER_BASIS]),
      traced("증빙 요건 부인액", i.proofExcluded, ["사용자가 사전에 분류한 증빙 부인액. 연간 총액에서 먼저 차감"], [ENTERTAINMENT.basis, USER_BASIS])];
    r.limit = traced("별도 인정분을 포함한 적용 한도", limit, ["기본한도 + 매출별 한도 + 문화비·시장 별도 인정분"], [ENTERTAINMENT.basis, CULTURE.basis]);
    r.reasons.push("연간 총액에서 증빙 부인액을 먼저 뺀 뒤 한도를 적용합니다. 매출은 실제 사업연도 금액이며 연환산하지 않습니다.");
    if (i.culture || i.market) r.review.push("문화비·전통시장·지역사랑상품권 요건, 제외 업종 및 중복 없는 분류는 Josh 감수 필요. 현행 특례 적용기간 이내 사업연도만 대상입니다.");
    return finish(Math.min(i.amount - i.proofExcluded, limit), ["min(연간 총액 − 증빙 부인액, 적용 한도)"], [ENTERTAINMENT.basis, CULTURE.basis]);
  }
  if (i.category === "car") {
    if (i.partialInsurance) { r.reasons.push("일부기간만 업무전용보험에 가입한 차량은 가입일수 안분이 필요합니다. Josh 감수 후 확정하세요."); return r; }
    if (i.months !== 12 || !i.fullYearCar) { r.reasons.push("단기 사업연도·일부기간 보유·임차 차량의 안분은 Josh 감수 필요. 연간 한도를 그대로 적용하지 않습니다."); return r; }
    if (!i.insured || !i.plateCompliant) {
      r.reasons.push("연중 업무전용보험 또는 적용 대상 법정 번호판 요건이 충족되지 않았다는 입력입니다. 일부기간 보험·번호판 적용대상 여부는 Josh 감수 필요.");
      return finish(0, ["보험 또는 법정 번호판 요건 미충족"], [CAR.basis]);
    }
    const ratio = i.logbook ? i.businessPercent / 100 : i.amount > 0 ? Math.min(1, CAR.value.noLog / i.amount) : 1;
    const businessDep = floorWon(i.depreciation * ratio);
    const running = floorWon((i.amount - i.depreciation) * ratio);
    const deferred = Math.max(0, businessDep - CAR.value.depreciation);
    r.limit = traced("차량별 연 감가상각 한도", CAR.value.depreciation, ["일반법인 연중 보유 차량 기준"], [CAR_DEPRECIATION_BASIS]);
    r.details = [traced("기록 없는 차량의 업무사용금액 기준", CAR.value.noLog, ["운행기록이 없을 때의 비율 산정 기준이며 전체 비용의 절대 한도가 아님"], [CAR.basis]),
      traced("업무사용 유지비", running, [`(총비용 − 감가상각비) × ${ratio * 100}% → 원 미만 버림`], [CAR.basis, USER_BASIS]),
      traced("업무사용 감가상각비", businessDep, [`입력 감가상각비 × ${ratio * 100}% → 원 미만 버림`], [CAR.basis, USER_BASIS])];
    r.reasons.push("자가 보유 승용차 한 대 기준입니다. 감가상각비는 법정 상각방법으로 산정한 금액을 입력하세요. 임차·리스는 이 엔진에서 제외합니다.");
    return finish(running + Math.min(businessDep, CAR.value.depreciation), ["업무사용 유지비 + min(업무사용 감가상각비, 연 감가상각 한도)"], [CAR.basis, CAR_DEPRECIATION_BASIS], deferred);
  }
  r.limit = traced("입력한 세법상 상각범위액", i.taxDepreciation, ["사용자가 자산·내용연수·상각률·사용월수·신고방법을 검증하여 산정한 값"], [METHOD_BASIS, USER_BASIS]);
  r.reasons.push("취득대금 전체가 아닌 장부에 비용으로 계상한 당기 감가상각비를 비교합니다. 취득가액·내용연수만으로 법정 상각률을 추정하지 않습니다.");
  r.review.push("상각범위액의 정확성, 자산 구분·신고방법·시인부족 및 과거 이월액은 Josh 감수 필요.");
  return finish(Math.min(i.amount, i.taxDepreciation), ["min(장부 계상 감가상각비, 검증해 입력한 상각범위액)"], [DEPRECIATION_BASIS, METHOD_BASIS], Math.max(0, i.amount - i.taxDepreciation));
}
