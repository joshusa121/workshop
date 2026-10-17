import type { Assumptions } from "../assumptions";
import {
  ACQUISITION_RELIEF,
  ACQUISITION_TAX,
  LOCAL_EDUCATION_TAX_ON_REGISTRATION,
  OVERCROWDED_ZONES,
  REGISTRATION_TAX,
} from "../rates";
import { floorWon } from "../rounding";
import { netAssetValue, type ScenarioInput } from "../scenario-input";
import type { Basis } from "../sources";
import { traced, type Traced } from "../trace";

export type ZoneResult = "해당" | "비해당" | "미확인";

const ROUNDING_NOTE = "지방세 단수 규칙 미확보 — 원 단위 버림";
const CAPITAL_ASSUMPTION: Basis = {
  kind: "assumption",
  description: "자본금 = 순자산가액(자산−부채)으로 가정 (세감면 최소 자본금과 동일)",
  editable: true,
};
const NONFARM_ASSUMPTION: Basis = {
  kind: "assumption",
  description: "부동산은 농지 외(4%)로 가정. 주택은 이월과세 제외 자산이라 대상에서 뺌. 산업단지·중과 제외 업종은 미반영",
  editable: true,
};

/** 대도시(과밀억제권역 − 산업단지) 판정. 일부 동만 해당하는 시·군은 미확인으로 둔다 */
export function isOvercrowdedZone(workplace: ScenarioInput["workplace"]): ZoneResult {
  const z = OVERCROWDED_ZONES.value;
  const { sido, sigungu = "" } = workplace;
  if (z.fullSido.some((s) => sido.includes(s))) return "해당";
  if (z.partialSido.some((s) => sido.includes(s))) return "미확인";
  if (sido.includes("경기")) {
    if (!sigungu) return "미확인";
    if (z.fullSigungu.some((s) => sigungu.includes(s))) return "해당";
    if (z.partialSigungu.some((s) => sigungu.includes(s))) return "미확인";
    return "비해당";
  }
  return "비해당";
}

/** 법인 설립 등록면허세. 자본금은 순자산가액 대용 */
export function registrationTax(input: ScenarioInput): Traced {
  const zone = isOvercrowdedZone(input.workplace);
  const hasCapital = typeof input.capital === "number" && input.capital > 0;
  const capital = hasCapital ? input.capital! : Math.max(0, netAssetValue(input));
  const { rate, minimum, metroMultiplier } = REGISTRATION_TAX.value;
  const base = Math.max(floorWon(capital * rate), minimum);
  const metro = base * metroMultiplier;
  const value = zone === "해당" ? metro : base;
  const steps = [
    `자본금(${hasCapital ? "입력값" : "순자산 대용"}) ${capital.toLocaleString("ko-KR")} × ${(rate * 1000).toFixed(0)}/1000 = ${floorWon(capital * rate).toLocaleString("ko-KR")}${base === minimum ? ` → 최저 ${minimum.toLocaleString("ko-KR")}` : ""}`,
    zone === "해당"
      ? `대도시 중과 × ${metroMultiplier} = ${metro.toLocaleString("ko-KR")}`
      : zone === "미확인"
        ? `과밀 미확인 — 대도시면 × ${metroMultiplier} = ${metro.toLocaleString("ko-KR")}`
        : "대도시 아님 — 중과 없음",
    "중과 제외 업종·조례 가감 미반영. 지방교육세는 별도 행",
    ROUNDING_NOTE,
  ];
  return traced("등록면허세", value, steps, [
    REGISTRATION_TAX.basis,
    OVERCROWDED_ZONES.basis,
    ...(hasCapital ? [] : [CAPITAL_ASSUMPTION]),
  ]);
}

/** 등록면허세 + 지방교육세(등록면허세액의 20%, 지방세법 §151①2호) */
export function registrationTaxWithEducation(input: ScenarioInput): Traced {
  const reg = registrationTax(input);
  const edu = floorWon(reg.value * LOCAL_EDUCATION_TAX_ON_REGISTRATION.value);
  return traced(
    "등록면허세 + 지방교육세",
    reg.value + edu,
    [
      `등록면허세 ${reg.value.toLocaleString("ko-KR")}`,
      `지방교육세 ${reg.value.toLocaleString("ko-KR")} × 20% = ${edu.toLocaleString("ko-KR")}`,
      ROUNDING_NOTE,
    ],
    [...reg.basis, LOCAL_EDUCATION_TAX_ON_REGISTRATION.basis],
  );
}

/** 감면 전 취득세. 주택 제외 부동산 × 4% (대도시 설립 5년 내는 8%) */
export function acquisitionTax(input: ScenarioInput): Traced {
  const zone = isOvercrowdedZone(input.workplace);
  const property = Math.max(0, input.assets.realEstate - input.assets.housing);
  const { standard, surchargeBase } = ACQUISITION_TAX.value;
  // 천분율 정수로 계산해 부동소수점 오차 제거 (40×3 − 20×2 = 80 → 8%)
  const metroRate = (standard * 1000 * 3 - surchargeBase * 1000 * 2) / 1000;
  const rate = zone === "해당" ? metroRate : standard;
  const value = floorWon(property * rate);
  const steps = [
    `과세 부동산(주택 제외) ${property.toLocaleString("ko-KR")} × ${(rate * 100).toFixed(0)}% = ${value.toLocaleString("ko-KR")}`,
    zone === "해당"
      ? `대도시 법인 설립 5년 내 취득 중과: ${(standard * 100).toFixed(0)}% × 3 − ${(surchargeBase * 100).toFixed(0)}% × 2 = ${(metroRate * 100).toFixed(0)}%`
      : zone === "미확인"
        ? `과밀 미확인 — 대도시면 ${(metroRate * 100).toFixed(0)}% = ${floorWon(property * metroRate).toLocaleString("ko-KR")}`
        : "대도시 아님 — 표준세율",
    "농특세·지방교육세 미반영",
    ROUNDING_NOTE,
  ];
  return traced("취득세 (감면 전)", value, steps, [ACQUISITION_TAX.basis, OVERCROWDED_ZONES.basis, NONFARM_ASSUMPTION]);
}

/** 지특법 §57의2 50% 경감 적용 후 */
export function acquisitionTaxAfterRelief(input: ScenarioInput): Traced {
  const before = acquisitionTax(input);
  const { rate, sunset } = ACQUISITION_RELIEF.value;
  const value = floorWon(before.value * (1 - rate));
  return traced(
    "취득세 (감면 후)",
    value,
    [
      `감면 전 ${before.value.toLocaleString("ko-KR")} × (1 − ${(rate * 100).toFixed(0)}%) = ${value.toLocaleString("ko-KR")}`,
      `${sunset}까지 취득분. 부동산 임대·공급업 제외. 중과와 감면의 결합 순서는 Josh 감수`,
    ],
    [...before.basis, ACQUISITION_RELIEF.basis],
  );
}

export function conversionCosts(
  input: ScenarioInput,
  a: Assumptions,
): {
  registrationTax: Traced;
  registrationTaxWithEducation: Traced;
  acquisitionTax: Traced;
  acquisitionTaxAfterRelief: Traced;
  sideCost: Traced;
  overcrowding: ZoneResult;
} {
  return {
    overcrowding: isOvercrowdedZone(input.workplace),
    registrationTax: registrationTax(input),
    registrationTaxWithEducation: registrationTaxWithEducation(input),
    acquisitionTax: acquisitionTax(input),
    acquisitionTaxAfterRelief: acquisitionTaxAfterRelief(input),
    sideCost: traced("설립 부대비용", a.incorporationSideCost, ["가정값. 기본 0=미반영"], [
      { kind: "assumption", description: "설립 부대비용", editable: true },
    ]),
  };
}
