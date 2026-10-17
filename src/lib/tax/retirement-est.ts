import { computeCorpTax } from "./corp-tax";
import { computeOwnerIncomeTax } from "./dividend";
import { applyBrackets } from "./progressive";
import {
  CORP_EXEC_RETIREMENT_DEDUCTIBLE,
  EXEC_RETIREMENT_LIMIT,
  INCOME_TAX_BRACKETS,
  LOCAL_TAX_RATE,
  RETIREMENT_CONVERTED_DEDUCTION,
  RETIREMENT_SERVICE_DEDUCTION,
  RETIREMENT_TAX_FORMULA,
} from "./rates";
import { floorTenWon, floorWon } from "./rounding";
import type { Basis } from "./sources";
import { traced, type Traced } from "./trace";

const won = (n: number) => n.toLocaleString("ko-KR");

const DIVIDEND_PATH: Basis = {
  kind: "assumption",
  description: "유보금 전액을 한 해에 배당으로 인출한다고 가정 (분산 인출 미반영)",
  editable: true,
};
const RETIREMENT_PATH: Basis = {
  kind: "assumption",
  description:
    "유보금 전액을 퇴직금으로 지급한다고 가정. 한도 초과분은 근로소득으로 합산(근로소득공제 미적용 — 보수적). 퇴직금 손금 효과(법인세 환급)는 미반영",
  editable: true,
};

/** 소득세법 §48·§55② 퇴직소득세. serviceYears 1년 미만은 1년 */
export function computeRetirementTax(retirementIncome: number, serviceYears: number) {
  const years = Math.max(1, Math.ceil(serviceYears));
  const income = Math.max(0, floorWon(retirementIncome));

  const sd = RETIREMENT_SERVICE_DEDUCTION.value.find((b) => b.upTo === null || years <= b.upTo)!;
  const serviceRaw = sd.base + sd.perYear * (years - sd.from);
  const serviceDed = Math.min(serviceRaw, income); // §48②
  const serviceDeduction = traced(
    "근속연수공제",
    serviceDed,
    [
      `근속 ${years}년: ${won(sd.base)} + ${won(sd.perYear)} × ${years - sd.from} = ${won(serviceRaw)}`,
      ...(serviceDed < serviceRaw ? [`퇴직소득 ${won(income)}이 공제에 미달 → 공제 = 퇴직소득 (§48②)`] : []),
    ],
    [RETIREMENT_SERVICE_DEDUCTION.basis],
  );

  const conv = floorWon(((income - serviceDed) / years) * RETIREMENT_TAX_FORMULA.value.monthsPerYear);
  const convertedSalary = traced(
    "환산급여",
    conv,
    [`(${won(income)} − ${won(serviceDed)}) ÷ ${years} × 12 = ${won(conv)}`],
    [RETIREMENT_SERVICE_DEDUCTION.basis],
  );

  const cd = RETIREMENT_CONVERTED_DEDUCTION.value.find((b) => b.upTo === null || conv <= b.upTo)!;
  const convDed = floorWon(cd.base + (conv - cd.from) * cd.rate);
  const convertedDeduction = traced(
    "환산급여공제",
    convDed,
    [`${won(cd.base)} + (${won(conv)} − ${won(cd.from)}) × ${(cd.rate * 100).toFixed(0)}% = ${won(convDed)}`],
    [RETIREMENT_CONVERTED_DEDUCTION.basis],
  );

  const base = Math.max(0, conv - convDed);
  const taxBase = traced("퇴직소득과세표준", base, [`${won(conv)} − ${won(convDed)} = ${won(base)}`], [RETIREMENT_CONVERTED_DEDUCTION.basis]);

  const onBase = applyBrackets(base, INCOME_TAX_BRACKETS, "과표 × 기본세율", floorTenWon);
  const tax = floorTenWon((onBase.value / RETIREMENT_TAX_FORMULA.value.monthsPerYear) * years);
  const incomeTax = traced(
    "퇴직소득 산출세액",
    tax,
    [...onBase.steps, `${won(onBase.value)} ÷ 12 × ${years}년 = ${won(tax)}`],
    [RETIREMENT_TAX_FORMULA.basis, INCOME_TAX_BRACKETS.basis],
  );
  const local = floorTenWon(tax * LOCAL_TAX_RATE.value);
  const localTax = traced("퇴직소득 지방소득세", local, [`${won(tax)} × 10% = ${won(local)}`], [LOCAL_TAX_RATE.basis]);

  return { serviceDeduction, convertedSalary, convertedDeduction, taxBase, incomeTax, localTax };
}

/** 임원 퇴직소득 한도 (§22③, 2020년 이후 근무분). 연평균 총급여 × 1/10 × 근무연수 × 2 */
export function execRetirementLimit(avgAnnualSalary: number, serviceYears: number): Traced {
  const years = Math.max(1, Math.ceil(serviceYears));
  const { ratio, multiple } = EXEC_RETIREMENT_LIMIT.value;
  const v = floorWon(Math.max(0, avgAnnualSalary) * ratio * years * multiple);
  const deductible = floorWon(Math.max(0, avgAnnualSalary) * CORP_EXEC_RETIREMENT_DEDUCTIBLE.value.ratio * years);
  return traced(
    "임원 퇴직소득 한도",
    v,
    [
      `${won(avgAnnualSalary)} × 1/10 × ${years}년 × ${multiple} = ${won(v)}`,
      `법인 손금 한도(정관 규정 없을 때, 영 §44④2호) ${won(deductible)} — 초과 지급분은 손금불산입`,
    ],
    [EXEC_RETIREMENT_LIMIT.basis, CORP_EXEC_RETIREMENT_DEDUCTIBLE.basis],
  );
}

export type DeferredOptions = {
  retirementPlan: boolean;
  salary: number;
  serviceYears: number;
  /** 정관 퇴직급여 배수(1·2·3). 생략 시 2 — 소득세 한도(§22③ ×2)와 같은 배수 */
  multiple?: 1 | 2 | 3;
  /** 3배 선택 시 비용 인정 증가분의 법인세 감소를 재는 법인 과세표준 (현재 연도 대용) */
  corpTaxBase?: number;
};

export type RetirementMultipleEffect = {
  /** 정관 배수로 늘어난 비용 인정분 = min(유보 − 소득세 한도, 손금 한도 − 소득세 한도) */
  deductibleIncrease: Traced;
  /** 그 증가분에 대한 법인세·지방세 감소 (현재 과표 기준 한계 효과) */
  corpTaxSaving: Traced;
  /** 소득세 한도(×2) 초과분을 근로소득으로 합산했을 때의 추가 소득세·지방세 */
  excessEarnedTax: Traced;
};

const MULTIPLE_BASIS: Basis = {
  kind: "assumption",
  description:
    "정관 배수 3배: 2배 초과 3배 이하 지급분은 법인 비용으로 인정(영 §44④1호 정관 규정 전제)하되 대표에게는 근로소득(§22③). 법인세 감소는 현재 연도 과표를 대용해 한계 효과로 추정",
  editable: true,
};

/** 정관 배수 3배의 두 효과 — 비용 인정 증가(법인세 감소) / 소득세 한도 초과분 근로소득세 */
export function retirementMultipleEffect(opts: {
  retained: number;
  salary: number;
  serviceYears: number;
  multiple: 1 | 2 | 3;
  corpTaxBase: number;
  otherComprehensive: number;
  deductions: number;
}): RetirementMultipleEffect {
  const years = Math.max(1, Math.ceil(opts.serviceYears));
  const { ratio, multiple: incomeTaxMultiple } = EXEC_RETIREMENT_LIMIT.value;
  const perMultiple = floorWon(Math.max(0, opts.salary) * ratio * years);
  const incomeTaxLimit = perMultiple * incomeTaxMultiple;
  const deductibleLimit = perMultiple * opts.multiple;
  const increase = Math.max(0, Math.min(opts.retained, deductibleLimit) - incomeTaxLimit);

  const before = computeCorpTax(opts.corpTaxBase);
  const after = computeCorpTax(Math.max(0, opts.corpTaxBase - increase));
  const saving = before.corpTax.value + before.localTax.value - after.corpTax.value - after.localTax.value;
  const excessTax = increase > 0 ? dividendPathTax(0, opts.otherComprehensive, opts.deductions, increase).extra : 0;

  return {
    deductibleIncrease: traced(
      "비용 인정 증가 (정관 배수)",
      increase,
      [
        `손금 한도 ${won(deductibleLimit)} (급여 × 1/10 × ${years}년 × ${opts.multiple}) − 소득세 한도 ${won(incomeTaxLimit)} (× ${incomeTaxMultiple})`,
        `유보 ${won(opts.retained)} 범위 내 증가분 ${won(increase)}`,
      ],
      [CORP_EXEC_RETIREMENT_DEDUCTIBLE.basis, EXEC_RETIREMENT_LIMIT.basis, MULTIPLE_BASIS],
    ),
    corpTaxSaving: traced(
      "법인세·지방세 감소 (비용 인정 증가분)",
      saving,
      [`과표 ${won(opts.corpTaxBase)} → ${won(Math.max(0, opts.corpTaxBase - increase))}: 법인세+지방세 ${won(saving)} 감소`],
      [...before.corpTax.basis, MULTIPLE_BASIS],
    ),
    excessEarnedTax: traced(
      "초과분 근로소득세 (소득세 한도 초과)",
      excessTax,
      [`소득세 한도 초과 ${won(increase)}을 근로소득으로 합산 → 추가 소득세·지방세 ${won(excessTax)}`],
      [EXEC_RETIREMENT_LIMIT.basis, MULTIPLE_BASIS],
    ),
  };
}

function dividendPathTax(retained: number, otherComprehensive: number, deductions: number, extraNonFinancial = 0) {
  const withDiv = computeOwnerIncomeTax({
    nonFinancialIncome: otherComprehensive + extraNonFinancial,
    deductions,
    dividend: retained,
    taxCredits: 0,
  });
  const without = computeOwnerIncomeTax({
    nonFinancialIncome: otherComprehensive,
    deductions,
    dividend: 0,
    taxCredits: 0,
  });
  return {
    extra: Math.max(0, withDiv.determinedTax.value + withDiv.localTax.value - without.determinedTax.value - without.localTax.value),
    basis: withDiv.calculatedTax.basis,
  };
}

/** 유보금 인출 시 추가 세부담. 배당 경로, 퇴직 설정 시 퇴직 경로도 계산해 최저값 */
export function estimateDeferredTax(
  retained: number,
  otherComprehensive: number,
  deductions: number,
  opts: DeferredOptions,
): Traced {
  if (retained <= 0) {
    return traced("2차 과세 추정", 0, ["유보 없음"], [DIVIDEND_PATH]);
  }
  const div = dividendPathTax(retained, otherComprehensive, deductions);
  const divStep = `배당 경로: 유보 ${won(retained)} 배당 시 추가 국세·지방세 ${won(div.extra)}`;

  if (!opts.retirementPlan) {
    return traced("2차 과세 추정 (배당 인출)", div.extra, [divStep, "퇴직급여 미설정 — 퇴직 경로 미계산"], [DIVIDEND_PATH, ...div.basis]);
  }

  const limit = execRetirementLimit(opts.salary, opts.serviceYears);
  const asRetirement = Math.min(retained, limit.value);
  const excess = retained - asRetirement;
  const rt = computeRetirementTax(asRetirement, opts.serviceYears);
  const excessTax = excess > 0 ? dividendPathTax(0, otherComprehensive, deductions, excess).extra : 0;
  const multiple = opts.multiple ?? 2;
  // 3배: 2배 초과 3배 이하 지급분의 법인세 감소를 퇴직 경로에서 뺀다 (초과분 근로소득세는 위 excessTax에 이미 포함)
  const effect =
    multiple === 3 && opts.corpTaxBase !== undefined
      ? retirementMultipleEffect({ retained, salary: opts.salary, serviceYears: opts.serviceYears, multiple, corpTaxBase: opts.corpTaxBase, otherComprehensive, deductions })
      : null;
  const saving = effect?.corpTaxSaving.value ?? 0;
  const retirementTotal = Math.max(0, rt.incomeTax.value + rt.localTax.value + excessTax - saving);
  const steps = [
    divStep,
    `퇴직 경로: 퇴직소득 ${won(asRetirement)} (한도 ${won(limit.value)}) → 퇴직소득세 ${won(rt.incomeTax.value)} + 지방 ${won(rt.localTax.value)}`,
    ...(excess > 0 ? [`한도 초과 ${won(excess)}은 근로소득으로 합산 → 추가 ${won(excessTax)}`] : []),
    ...(multiple === 1 ? ["정관 1배: 급여 × 1/10 × 근속 초과 지급분은 손금불산입 (금액 효과 미반영)"] : []),
    ...(effect ? [`정관 3배: 비용 인정 증가 ${won(effect.deductibleIncrease.value)} → 법인세 감소 ${won(saving)} 차감`] : []),
    `퇴직 경로 합계 ${won(retirementTotal)}`,
  ];
  const min = Math.min(div.extra, retirementTotal);
  const label = min === retirementTotal ? "2차 과세 추정 (퇴직 인출이 유리)" : "2차 과세 추정 (배당 인출이 유리)";
  return traced(label, min, steps, [
    DIVIDEND_PATH,
    RETIREMENT_PATH,
    ...div.basis,
    ...rt.incomeTax.basis,
    ...limit.basis,
    ...(effect ? [MULTIPLE_BASIS] : []),
  ]);
}
