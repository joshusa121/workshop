import { floorWon } from "@/lib/tax/rounding";
import type { Basis } from "@/lib/tax/sources";
import { traced, type Traced } from "@/lib/tax/trace";
import { inputErrors, STARTUP_KINDS, type StartupReliefInput } from "./input";
import { LOW_REVENUE, LOW_REVENUE_RATES, RELIEF_CAP, RELIEF_YEARS, STARTUP_BASIS, STARTUP_RATES, STARTUP_SUNSET } from "./rates-startup";

export type StartupReliefResult = {
  status: "eligible" | "ineligible" | "review";
  reasons: string[];
  notes: string[];
  rate: Traced | null;
  relief: Traced | null;
  beforeCap: Traced | null;
  periodStart: Traced | null;
  periodEnd: Traced | null;
  eligibleTax: Traced;
  annualRevenue: Traced;
  cap: Traced;
  lowRevenueApplied: boolean;
};
const NOTES = [
  "2025~2027년의 일반 창업, 2026년 이후 개시 과세연도를 대상으로 합니다. 개인과 사업연도가 역년인 법인(연말 결산)에 한정합니다.",
  "지역 구분·청년 대표자·중소기업·대상 업종은 확인된 입력을 전제로 합니다. 실제 사실관계와 산업분류는 Josh 감수 필요입니다.",
  "수입금액은 이익이 아닌 매출 등 총수입이며, 과세기간이 짧으면 연간으로 환산한 금액을 직접 입력합니다. 감면기간 중 적자여도 기간은 계속 흐릅니다.",
  "입력 산출세액은 감면 대상 사업에서 발생한 소득에 해당하는 국세만입니다. 다른 소득과 섞인 경우 구분경리·세액 배분은 Josh 감수 필요입니다.",
  "표시액은 최저한세·다른 세액공제와의 중복 제한·지방소득세·농어촌특별세를 반영하기 전의 감면액이며, 최종 납부세액이 아닙니다.",
  "창업벤처·창업보육센터·에너지신기술·신성장서비스 특례, 고용 증가 추가감면은 계산하지 않습니다. 해당 여부와 유불리는 Josh 감수 필요입니다.",
  "사업장 이전·지점 설치·대표자 지분이나 손익분배비율 변경·중소기업 지위 상실·승계 예외는 별도 검토합니다.",
  "법인전환 전 사업의 남은 감면 승계 여부는 이 계산에서 다루지 않습니다. Josh 감수 필요입니다.",
  "감면은 자동 적용되지 않습니다. 과세표준 신고 시 세액감면신청서를 제출해야 합니다.",
];
export function computeStartupRelief(i: StartupReliefInput): StartupReliefResult {
  const assumption: Basis = { kind: "assumption", description: "사용자가 확인해 입력한 수입금액과 감면 대상 사업의 국세 산출세액. 자동 산출·배분하지 않음", editable: true };
  const r: StartupReliefResult = {
    status: "review", reasons: [], notes: [...NOTES], rate: null, relief: null, beforeCap: null,
    periodStart: null, periodEnd: null, lowRevenueApplied: false,
    eligibleTax: traced("감면 대상 사업 국세 산출세액", i.eligibleTax, ["사용자 입력 (다른 사업 소득분은 제외)"], [assumption, STARTUP_BASIS.rate]),
    annualRevenue: traced("연환산 수입금액", i.annualRevenue, ["사용자 입력 (짧은 과세기간은 연간 환산)"], [assumption, LOW_REVENUE.basis]),
    cap: traced("과세연도별 감면 한도", RELIEF_CAP.value, ["2025년 이후 창업 등의 제6조 감면세액 합계 한도"], [RELIEF_CAP.basis]),
  };
  const errors = inputErrors(i);
  if (errors.length) { r.reasons = errors; return r; }
  const zero = (reason: string, basis: Basis) => {
    r.status = "ineligible"; r.reasons.push(reason);
    r.rate = traced("이 계산의 적용 감면율", 0, [reason], [basis]);
    r.beforeCap = traced("한도 적용 전 감면액", 0, [reason], [basis]);
    r.relief = traced("감면액", 0, [reason], [basis]);
    return r;
  };
  if (i.taxYear > 2026) r.notes.unshift("미래 연도는 2026-10-17에 확인한 법령이 유지된다는 가정입니다. 해당 연도 개정·일몰 연장은 Josh 감수 필요입니다.");
  if (i.startupDate < "2025-01-01") { r.reasons.push("2024년 이전 창업의 종전 규정·신성장서비스 특례·한도 적용례는 Josh 감수 필요입니다."); return r; }
  if (i.startupDate > STARTUP_SUNSET.value) return zero("현행 창업 일몰일 이후입니다. 향후 일몰 연장은 Josh 감수 필요입니다.", STARTUP_SUNSET.basis);
  if (["conversion", "restart", "expansion"].includes(i.startupKind)) return zero(`${STARTUP_KINDS[i.startupKind]}: 법인전환·동종 재창업·기존 사업 확장은 창업으로 보지 않습니다.`, STARTUP_BASIS.startup);
  if (i.sme === "no") return zero("중소기업 요건을 충족하지 않는다는 입력입니다.", STARTUP_BASIS.sme);
  if (i.industry === "excluded") return zero("법 제6조 제3항의 감면 대상 업종에 해당하지 않는다는 입력입니다.", STARTUP_BASIS.industry);
  if (i.startupKind === "succession") r.reasons.push("종전 사업·자산 승계의 창업 제외 및 예외 요건은 Josh 감수 필요입니다.");
  if (i.startupKind === "unknown") r.reasons.push("창업 유형 미확인: Josh 감수 필요입니다.");
  if (i.sme === "unknown") r.reasons.push("중소기업 요건 미확인: Josh 감수 필요입니다.");
  if (i.industry === "unknown") r.reasons.push("감면 대상 업종 미확인: Josh 감수 필요입니다.");
  if (i.youth === "unknown") r.reasons.push("청년창업 요건 미확인: Josh 감수 필요입니다.");
  if (i.region === "unknown") r.reasons.push("창업 지역의 권역 구분 미확인: Josh 감수 필요입니다.");
  if (i.specialCase) r.reasons.push("사업장 이전·대표자 요건 변경·특수 감면 등은 Josh 감수 필요입니다.");
  if (r.reasons.length) return r;

  const year = Number(i.startupDate.slice(0, 4));
  const start = Math.min(i.firstIncomeYear ?? year + RELIEF_YEARS.value, year + RELIEF_YEARS.value);
  const end = start + RELIEF_YEARS.value - 1;
  r.periodStart = traced("감면 시작 과세연도", start,
    [i.firstIncomeYear === null ? "아직 무소득: 창업 후 5년 도래까지 무소득이 계속될 때의 시작 연도 (그 전에 소득이 생기면 앞당겨짐)" : `최초 소득 연도와 창업 후 ${RELIEF_YEARS.value}년 도래 연도 중 빠른 연도`], [STARTUP_BASIS.period]);
  r.periodEnd = traced("감면 종료 과세연도", end, ["시작 연도부터 이후 4년 말까지, 중간 적자도 기간에 포함"], [STARTUP_BASIS.period]);
  if (i.taxYear < start || i.taxYear > end) return zero(i.taxYear < start ? "계산 연도에는 감면기간이 아직 시작되지 않았습니다." : "계산 연도는 감면기간이 끝난 뒤입니다.", STARTUP_BASIS.period);

  const regionIndex = { outside: 0, depopulation: 1, capital: 2, overcrowded: 3, unknown: 0 }[i.region];
  const era = i.startupDate < "2026-01-01" ? "before2026" : "from2026";
  r.lowRevenueApplied = i.youth === "no" && i.annualRevenue <= LOW_REVENUE.value;
  const rateEntry = r.lowRevenueApplied ? LOW_REVENUE_RATES : STARTUP_RATES;
  const rate = r.lowRevenueApplied ? LOW_REVENUE_RATES.value[era][regionIndex] : STARTUP_RATES.value[era][i.youth === "yes" ? "youth" : "ordinary"][regionIndex];
  const reason = r.lowRevenueApplied ? "청년 외 창업기업으로 연환산 수입금액이 기준 이하이므로 제6항을 적용합니다." : "창업일·지역·청년 요건에 따른 제1항 기본감면을 적용합니다.";
  r.rate = traced("적용 감면율", rate, [reason, "다른 특례·고용 추가감면 미반영"], [rateEntry.basis]);
  const beforeCap = floorWon(i.eligibleTax * rate);
  r.beforeCap = traced("한도 적용 전 감면액", beforeCap,
    [`${i.eligibleTax.toLocaleString("ko-KR")}원 × ${rate * 100}% = ${beforeCap.toLocaleString("ko-KR")}원 (1원 미만 버림)`], [assumption, rateEntry.basis, { kind: "assumption", description: "감면액은 비교 표시를 위해 원 미만 버림. 실제 신고서 끝수 처리는 Josh 감수 필요", editable: true }]);
  r.relief = traced("최저한세 등 반영 전 감면액", Math.min(beforeCap, RELIEF_CAP.value),
    ["한도 적용 전 감면액과 연간 한도 중 작은 금액", "다른 제6조 감면액은 없다는 전제"], [...r.beforeCap.basis, RELIEF_CAP.basis]);
  r.status = rate > 0 ? "eligible" : "ineligible";
  r.reasons.push(reason);
  if (rate === 0) r.reasons.push("청년 외 과밀억제권역 창업이고 수입금액 특례에도 해당하지 않아 이 계산의 감면율은 0%입니다.");
  return r;
}
