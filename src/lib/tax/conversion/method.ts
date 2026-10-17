import type { Assumptions } from "../assumptions";
import { ACQUISITION_RELIEF, CONVERSION_DEFERRAL } from "../rates";
import { acquisitionTax, acquisitionTaxAfterRelief } from "./cost";
import { netAssetValue, type ScenarioInput } from "../scenario-input";
import type { Basis } from "../sources";
import { traced, type Traced } from "../trace";

export type ConversionMethod = "신설법인" | "일반양수도" | "세감면포괄양수도" | "현물출자";
export type RequirementCheck = {
  id: string;
  title: string;
  result: "충족" | "미충족" | "미확인";
  detail: string;
  basis: Basis[];
};
export type MethodAssessment = {
  method: ConversionMethod;
  viability: "유력" | "가능" | "곤란";
  /** 표시 순서. 1이 1순위 (Josh 2026-09-26 규칙: 부동산 없음→일반양수도, 있음→세감면 포괄양수도, 현물출자 2순위) */
  rank: number;
  /** 순위 이유 한 줄 (쉬운 말) */
  note: string;
  satisfied: RequirementCheck[];
  unverified: RequirementCheck[];
  expertItems: string[];
};

/** 전환 대상 사업용 부동산(주택 제외) 보유 여부 */
export function hasBusinessRealEstate(input: ScenarioInput): boolean {
  return input.assets.realEstate - input.assets.housing > 0;
}

function housingCheck(input: ScenarioInput): RequirementCheck {
  const has = input.assets.housing > 0;
  return {
    id: "housing",
    title: "주택·주택취득권 제외",
    result: has ? "미충족" : "충족",
    detail: has
      ? "주택 가액이 있어 이월과세 대상에서 빠질 수 있다"
      : "주택 입력 없음",
    basis: [CONVERSION_DEFERRAL.basis],
  };
}

function capitalCheck(input: ScenarioInput): RequirementCheck {
  const need = netAssetValue(input);
  const won = (n: number) => n.toLocaleString("ko-KR");
  const base = { id: "capital", title: "자본금 ≥ 순자산가액", basis: [CONVERSION_DEFERRAL.basis] };
  if (typeof input.capital === "number" && input.capital > 0) {
    const ok = input.capital >= need;
    return {
      ...base,
      result: ok ? "충족" : "미충족",
      detail: ok
        ? `자본금 ${won(input.capital)}원 ≥ 순자산 대용 ${won(need)}원`
        : `자본금 ${won(input.capital)}원 < 순자산 대용 ${won(need)}원 — 부족 ${won(need - input.capital)}원`,
    };
  }
  return {
    ...base,
    result: need > 0 ? "미확인" : "충족",
    detail: `최소 자본금 대용(자산−부채) ${won(need)}원. 실제 출자액은 입력에 없음`,
  };
}

function sunsetCheck(): RequirementCheck {
  const ok = ACQUISITION_RELIEF.value.sunset >= "2026-09-02";
  return {
    id: "sunset",
    title: "취득세 감면 일몰",
    result: ok ? "충족" : "미충족",
    detail: `${ACQUISITION_RELIEF.value.sunset}까지 취득`,
    basis: [ACQUISITION_RELIEF.basis],
  };
}

function excludedCorpCheck(): RequirementCheck {
  return {
    id: "excluded-corp",
    title: "소비성서비스업 제외 (영 §29③)",
    result: "미확인",
    detail: "호텔·유흥 등 제외 법인은 업종군만으로 판정 불가",
    basis: [CONVERSION_DEFERRAL.basis],
  };
}

function rentalExclusionCheck(): RequirementCheck {
  return {
    id: "rental-exclusion",
    title: "부동산 임대·공급업 취득세 감면 제외",
    result: "미확인",
    detail: "한국표준산업분류 세분류가 없음 — 감면 제외 여부 미확인",
    basis: [ACQUISITION_RELIEF.basis],
  };
}

export function assessMethods(input: ScenarioInput): MethodAssessment[] {
  const housing = housingCheck(input);
  const capital = capitalCheck(input);
  const sunset = sunsetCheck();
  const excludedCorp = excludedCorpCheck();
  const rental = rentalExclusionCheck();
  const vat: RequirementCheck = {
    id: "vat",
    title: "포괄양수도 부가세 해당성",
    result: "미확인",
    detail: "시행령 요건(사업 동일성·포괄 승계)은 입력만으로 판정 불가",
    basis: [],
  };
  const expert = [
    "세무사·법무사 확인 필요: 재고·영업권 승계, 고용승계, 감정평가",
    "5년 사후관리(폐업·지분 50% 처분) 추징 위험",
  ];
  const reliefChecks = [housing, capital, sunset];
  const reliefSatisfied = reliefChecks.filter((c) => c.result === "충족");
  const reliefUnverified = [
    ...reliefChecks.filter((c) => c.result !== "충족"),
    vat,
    excludedCorp,
    rental,
  ];
  const reliefBlocked = housing.result === "미충족" || capital.result === "미충족";
  const realEstate = hasBusinessRealEstate(input);

  const list: MethodAssessment[] = realEstate
    ? [
        {
          method: "세감면포괄양수도",
          viability: reliefBlocked ? "곤란" : "유력",
          rank: 1,
          note: "부동산이 있어 취득세 감면·양도세 이월과세 효과가 큰 방법",
          satisfied: reliefSatisfied,
          unverified: reliefUnverified,
          expertItems: ["설립 후 3개월 내 포괄양도", ...expert],
        },
        {
          method: "현물출자",
          viability: reliefBlocked ? "곤란" : "가능",
          rank: 2,
          note: "법인 자본금을 현금으로 마련하기 어려울 때",
          satisfied: reliefSatisfied,
          unverified: reliefUnverified,
          expertItems: ["현물출자 등기·감정평가", ...expert],
        },
        {
          method: "일반양수도",
          viability: "가능",
          rank: 3,
          note: "감면을 포기하는 대신 절차가 단순",
          satisfied: [],
          unverified: [vat],
          expertItems: ["세감면 없이 양도·취득 과세", ...expert],
        },
        {
          method: "신설법인",
          viability: "가능",
          rank: 4,
          note: "폐업 후 새로 시작 — 자산 이전 효과 없음",
          satisfied: [],
          unverified: [vat],
          expertItems: ["이월과세·취득세 감면 없음 (폐업 후 신설)", ...expert],
        },
      ]
    : [
        {
          method: "일반양수도",
          viability: "유력",
          rank: 1,
          note: "부동산이 없어 세감면 실익이 없고 절차가 단순",
          satisfied: [],
          unverified: [vat],
          expertItems: ["세감면 없이 양도·취득 과세", ...expert],
        },
        {
          method: "신설법인",
          viability: "가능",
          rank: 2,
          note: "폐업 후 새로 시작 — 자산 이전 효과 없음",
          satisfied: [],
          unverified: [vat],
          expertItems: ["이월과세·취득세 감면 없음 (폐업 후 신설)", ...expert],
        },
        {
          method: "세감면포괄양수도",
          viability: reliefBlocked ? "곤란" : "가능",
          rank: 3,
          note: "감면 대상 부동산이 없어 실익이 작다",
          satisfied: reliefSatisfied,
          unverified: reliefUnverified,
          expertItems: ["설립 후 3개월 내 포괄양도", ...expert],
        },
        {
          method: "현물출자",
          viability: reliefBlocked ? "곤란" : "가능",
          rank: 4,
          note: "법인 자본금을 현금으로 마련하기 어려울 때",
          satisfied: reliefSatisfied,
          unverified: reliefUnverified,
          expertItems: ["현물출자 등기·감정평가", ...expert],
        },
      ];
  return list;
}

/**
 * 세감면 실익 vs 감정평가·법무 비용. 이월과세 효과는 엔진에 값이 없어 취득세 감면액만 센다.
 * benefit < cost 이면 「세감면을 포기하고 일반 양수도가 유리할 수 있다」.
 */
export function reliefVersusCost(
  input: ScenarioInput,
  a: Assumptions,
): { benefit: Traced; cost: Traced; preferGeneral: boolean } {
  const before = acquisitionTax(input);
  const after = acquisitionTaxAfterRelief(input);
  const reliefAmount = before.value - after.value;
  const benefit = traced(
    "세감면 실익 (취득세 감면액)",
    reliefAmount,
    [
      `취득세 감면 전 ${before.value.toLocaleString("ko-KR")} − 감면 후 ${after.value.toLocaleString("ko-KR")} = ${reliefAmount.toLocaleString("ko-KR")}`,
      "양도세 이월과세 효과는 양도차익·취득가 입력이 없어 0으로 둠 (실제 실익은 이보다 클 수 있음)",
    ],
    after.basis,
  );
  const total = a.appraisalCost + a.inKindContributionLegalCost;
  const cost = traced(
    "감정평가 + 법무 비용",
    total,
    [`감정평가 ${a.appraisalCost.toLocaleString("ko-KR")} + 법무 ${a.inKindContributionLegalCost.toLocaleString("ko-KR")}`],
    [
      { kind: "assumption", description: "감정평가 비용(기본 200만)·현물출자 법무 비용(기본 500만). 수정 가능", editable: true },
    ],
  );
  // 감면 대상 부동산이 없으면(감면액 0) 비교 자체가 무의미 — 제안하지 않는다
  return { benefit, cost, preferGeneral: reliefAmount > 0 && reliefAmount < total };
}

/** 영업권 양도 검토 대상: 이익 2억 이상 & (이익 − 순자산 × 10%) > 0 인 서비스업. 계산 없음 — 뱃지만 */
export function isGoodwillCandidate(input: ScenarioInput): boolean {
  const profit = input.accountingProfit + input.taxAdjustment;
  return input.industryGroup === "서비스임대" && profit >= 200_000_000 && profit - netAssetValue(input) * 0.1 > 0;
}

export function minCapitalForRelief(input: ScenarioInput): Traced {
  const v = Math.max(0, netAssetValue(input));
  return traced(
    "세감면 최소 자본금 (순자산가액 대용)",
    v,
    ["자산 합계 − 부채. 영 §28 정밀 산식은 미반영"],
    [CONVERSION_DEFERRAL.basis],
  );
}

export function reliefLossIfUnmet(input: ScenarioInput): Traced {
  const before = acquisitionTax(input);
  const after = acquisitionTaxAfterRelief(input);
  const lost = before.value - after.value;
  return traced(
    "감면 미충족 시 손실액",
    lost,
    [
      `취득세 감면 상실분: ${before.value.toLocaleString("ko-KR")} − ${after.value.toLocaleString("ko-KR")} = ${lost.toLocaleString("ko-KR")}`,
      "양도세 이월과세 배제분은 양도차익·취득가 입력이 없어 미계산",
      `자본금이 순자산 대용 ${minCapitalForRelief(input).value.toLocaleString("ko-KR")}원에 미달하면 발생`,
    ],
    [...after.basis],
  );
}
