import { applyBrackets } from "../progressive";
import { INCOME_TAX_BRACKETS, LOCAL_TAX_RATE, SINCERE_CONFIRM_CAP_INDIV, SINCERE_CONFIRM_CREDIT_RATE } from "../rates";
import { earnedIncomeAmount, earnedIncomeTaxCredit, standardTaxCredit, yellowUmbrellaDeduction } from "../deductions";
import { floorTenWon, floorWon } from "../rounding";
import { LOCAL_TAX_DETERMINED_BASIS } from "../sources";
import { sumTraced, traced, type Traced } from "../trace";
import {
  ADDITIONAL_DEDUCTION,
  BASIC_DEDUCTION_PER_PERSON,
  BIZ_WITHHOLDING_RATE,
  BUSINESS_INCOME_BASIS,
  CHILD_TAX_CREDIT,
  FILING_WINDOW,
  LOCAL_WITHHOLDING_RATE,
  NPS_DEDUCTION_BASIS,
  PENSION_ACCOUNT_CREDIT,
} from "./rates-comp";
import type { CompIncomeInput } from "./input";
import { normalizeCompIncome } from "./input";

export type CompIncomeResult = {
  businessIncome: Traced;
  deficiency: number;
  salaryIncome: Traced;
  totalIncome: Traced;
  basicDeduction: Traced;
  additionalDeduction: Traced;
  npsDeduction: Traced;
  yellowUmbrella: Traced;
  deductionTotal: Traced;
  taxBase: Traced;
  calcTax: Traced;
  credits: {
    standard: Traced;
    child: Traced;
    pension: Traced;
    earned: Traced;
    sincere: Traced;
    total: Traced;
  };
  determinedTax: Traced;
  localTax: Traced;
  prepaid: { fed: number; local: number; total: number; auto: boolean };
  dueFed: number;
  dueLocal: number;
  dueTotal: number;
  notes: string[];
};

const ZERO = (label: string): Traced => traced(label, 0, ["해당 없음"], []);

function childCredit(children: number): Traced {
  const c = CHILD_TAX_CREDIT.value;
  if (children <= 0) return ZERO("자녀세액공제");
  let v: number;
  let how: string;
  if (children === 1) {
    v = c.one;
    how = "1명 25만원";
  } else if (children === 2) {
    v = c.two;
    how = "2명 55만원";
  } else {
    v = c.base3 + c.perExtra * (children - 2);
    how = `3명 이상 55만 + (${children}−2)명 × 40만 = ${v.toLocaleString("ko-KR")}원`;
  }
  return traced("자녀세액공제", v, [`자녀 ${children}명 → ${how}`], [CHILD_TAX_CREDIT.basis]);
}

function pensionCredit(paid: number, totalIncome: number): Traced {
  const p = PENSION_ACCOUNT_CREDIT.value;
  if (paid <= 0) return ZERO("연금계좌세액공제");
  const eligible = Math.min(paid, p.combinedCap);
  const rate = totalIncome <= p.lowIncomeThreshold ? p.rateLow : p.rateBase;
  const credit = floorWon(eligible * rate);
  return traced(
    "연금계좌세액공제",
    credit,
    [
      `납입 ${paid.toLocaleString("ko-KR")}원 → 한도 ${p.combinedCap.toLocaleString("ko-KR")}원(연금저축 600만 + IRP 합계 900만) 적용 ${eligible.toLocaleString("ko-KR")}원`,
      `공제율 ${(rate * 100).toFixed(0)}% (종합소득금액 ${totalIncome.toLocaleString("ko-KR")}원 ${totalIncome <= p.lowIncomeThreshold ? "이하" : "초과"})`,
    ],
    [PENSION_ACCOUNT_CREDIT.basis],
  );
}

function sincereCredit(applies: boolean, cost: number): Traced {
  if (!applies) return ZERO("성실신고확인비용 세액공제");
  const value = Math.min(floorWon(cost * SINCERE_CONFIRM_CREDIT_RATE.value), SINCERE_CONFIRM_CAP_INDIV.value);
  return traced(
    "성실신고확인비용 세액공제",
    value,
    [
      `확인비용 ${cost.toLocaleString("ko-KR")}원 × ${Math.round(SINCERE_CONFIRM_CREDIT_RATE.value * 100)}% = ${floorWon(cost * SINCERE_CONFIRM_CREDIT_RATE.value).toLocaleString("ko-KR")}원, 한도 ${SINCERE_CONFIRM_CAP_INDIV.value / 10_000}만원 적용`,
    ],
    [SINCERE_CONFIRM_CREDIT_RATE.basis, SINCERE_CONFIRM_CAP_INDIV.basis],
  );
}

export function computeCompIncome(input: CompIncomeInput): CompIncomeResult {
  const i = normalizeCompIncome(input);
  const notes: string[] = [];

  const rawBusiness = i.revenue - i.expenses;
  const businessValue = Math.max(0, rawBusiness);
  const deficiency = Math.max(0, i.expenses - i.revenue);
  const businessIncome = traced(
    "사업소득금액",
    businessValue,
    [
      `총수입금액 ${i.revenue.toLocaleString("ko-KR")} − 필요경비 ${i.expenses.toLocaleString("ko-KR")} = ${rawBusiness.toLocaleString("ko-KR")}`,
      deficiency > 0 ? `필요경비가 초과 → 결손금 ${deficiency.toLocaleString("ko-KR")}원(사업소득금액 0)` : "과표 1원 미만 버림",
    ],
    [BUSINESS_INCOME_BASIS],
  );

  const salaryIncome = i.grossSalary > 0 ? earnedIncomeAmount(i.grossSalary) : ZERO("근로소득금액");
  const totalIncome = sumTraced("종합소득금액", [businessIncome, salaryIncome]);

  const headCount = 1 + (i.spouse ? 1 : 0) + i.dependents;
  const basicValue = headCount * BASIC_DEDUCTION_PER_PERSON.value;
  const basicDeduction = traced(
    "기본공제",
    basicValue,
    [`본인 1명${i.spouse ? " + 배우자 1명" : ""}${i.dependents > 0 ? ` + 부양가족 ${i.dependents}명` : ""} = ${headCount}명 × 150만원`],
    [BASIC_DEDUCTION_PER_PERSON.basis],
  );

  const a = ADDITIONAL_DEDUCTION.value;
  const singleParentApplied = i.singleParent;
  const addValue =
    i.elderly * a.elderly + i.disabled * a.disabled + (singleParentApplied ? a.singleParent : i.femaleHead ? a.femaleHead : 0);
  const additionalDeduction = traced(
    "추가공제",
    addValue,
    [
      i.elderly > 0 ? `경로우대 70세↑ ${i.elderly}명 × 100만` : "경로우대 없음",
      i.disabled > 0 ? `장애인 ${i.disabled}명 × 200만` : "장애인 없음",
      singleParentApplied ? "한부모 100만(부녀자와 중복 시 한부모만)" : i.femaleHead ? "부녀자 50만" : "부녀자/한부모 없음",
    ],
    [ADDITIONAL_DEDUCTION.basis],
  );

  const npsDeduction =
    i.npsPaid > 0
      ? traced("연금보험료공제(국민연금)", i.npsPaid, [`본인부담 납입액 ${i.npsPaid.toLocaleString("ko-KR")}원`], [NPS_DEDUCTION_BASIS])
      : ZERO("연금보험료공제(국민연금)");
  const yellowUmbrella = yellowUmbrellaDeduction(businessIncome.value, i.yellowUmbrellaPaid);

  const rawDeduction = basicValue + addValue + npsDeduction.value + yellowUmbrella.value;
  const deductionValue = Math.min(rawDeduction, totalIncome.value);
  const deductionTotal = traced(
    "종합소득공제 합계",
    deductionValue,
    [
      `기본 ${basicValue.toLocaleString("ko-KR")} + 추가 ${addValue.toLocaleString("ko-KR")} + 연금보험료 ${npsDeduction.value.toLocaleString("ko-KR")} + 노란우산 ${yellowUmbrella.value.toLocaleString("ko-KR")} = ${rawDeduction.toLocaleString("ko-KR")}`,
      rawDeduction > totalIncome.value ? `종합소득금액 ${totalIncome.value.toLocaleString("ko-KR")} 초과분은 공제하지 않음(§51의3③)` : "종합소득금액 이내",
    ],
    [BASIC_DEDUCTION_PER_PERSON.basis, ADDITIONAL_DEDUCTION.basis, NPS_DEDUCTION_BASIS],
  );

  const taxBase = traced(
    "종합소득과세표준",
    floorWon(Math.max(0, totalIncome.value - deductionValue)),
    [`종합소득금액 ${totalIncome.value.toLocaleString("ko-KR")} − 공제 ${deductionValue.toLocaleString("ko-KR")}`],
    [],
  );

  const calcTax = applyBrackets(taxBase.value, INCOME_TAX_BRACKETS, "종합소득 산출세액", floorTenWon);

  const hasEarned = i.grossSalary > 0;
  const standard = standardTaxCredit(hasEarned);
  const child = childCredit(i.children8Plus);
  const pension = pensionCredit(i.pensionAccountPaid, totalIncome.value);

  let earned = ZERO("근로소득세액공제");
  if (hasEarned && totalIncome.value > 0) {
    const earnedPortion = floorWon(calcTax.value * (salaryIncome.value / totalIncome.value));
    const ec = earnedIncomeTaxCredit(earnedPortion, i.grossSalary);
    earned = traced("근로소득세액공제", ec.value, [`근로소득분 산출세액 ${earnedPortion.toLocaleString("ko-KR")}원 기준`, ...ec.steps], ec.basis);
    notes.push("근로소득세액공제는 종합소득 산출세액을 근로·사업 소득금액 비율로 안분해 계산했습니다(홈택스 방식).");
  }

  const sincere = sincereCredit(i.sincereApplies, i.sincereConfirmCost);

  const rawCredit = standard.value + child.value + pension.value + earned.value + sincere.value;
  const creditValue = Math.min(rawCredit, calcTax.value);
  const creditTotal = traced(
    "세액공제 합계",
    creditValue,
    [
      `표준 ${standard.value.toLocaleString("ko-KR")} + 자녀 ${child.value.toLocaleString("ko-KR")} + 연금계좌 ${pension.value.toLocaleString("ko-KR")} + 근로 ${earned.value.toLocaleString("ko-KR")} + 성실신고 ${sincere.value.toLocaleString("ko-KR")} = ${rawCredit.toLocaleString("ko-KR")}`,
      rawCredit > calcTax.value ? "산출세액 한도로 제한" : "산출세액 이내",
    ],
    [],
  );

  const determinedTax = traced(
    "결정세액",
    Math.max(0, calcTax.value - creditValue),
    [`산출세액 ${calcTax.value.toLocaleString("ko-KR")} − 세액공제 ${creditValue.toLocaleString("ko-KR")}`, "음수면 0"],
    [],
  );

  const localTax = traced(
    "개인지방소득세 (결정세액 × 10%)",
    floorTenWon(determinedTax.value * LOCAL_TAX_RATE.value),
    [`결정세액 ${determinedTax.value.toLocaleString("ko-KR")} × 10%`],
    [LOCAL_TAX_RATE.basis, LOCAL_TAX_DETERMINED_BASIS],
  );

  const autoFed = Math.floor(i.revenue * BIZ_WITHHOLDING_RATE.value);
  const autoLocal = Math.floor(i.revenue * LOCAL_WITHHOLDING_RATE.value * BIZ_WITHHOLDING_RATE.value);
  let prepaidFed: number;
  let prepaidLocal: number;
  const manual = i.prepaidWithholding;
  const auto = manual === null;
  if (manual === null) {
    prepaidFed = autoFed;
    prepaidLocal = autoLocal;
  } else {
    prepaidFed = Math.round(manual / 1.1);
    prepaidLocal = manual - prepaidFed;
  }

  const dueFed = determinedTax.value - prepaidFed;
  const dueLocal = localTax.value - prepaidLocal;
  const dueTotal = dueFed + dueLocal;

  notes.unshift(
    `확정신고 기한 ${FILING_WINDOW.value.from}~${FILING_WINDOW.value.to} (소득세법 제70조 제1항).`,
    "원천징수세율: 원천징수대상 사업소득 3%(소득세법 제129조 제1항 제3호) + 개인지방소득세 0.3%(지방세법 제103조의13 제1항).",
    "경비율(단순·기준) 자동 산정은 미반영 — 입력한 실제 필요경비만 반영했습니다.",
  );

  return {
    businessIncome,
    deficiency,
    salaryIncome,
    totalIncome,
    basicDeduction,
    additionalDeduction,
    npsDeduction,
    yellowUmbrella,
    deductionTotal,
    taxBase,
    calcTax,
    credits: { standard, child, pension, earned, sincere, total: creditTotal },
    determinedTax,
    localTax,
    prepaid: { fed: prepaidFed, local: prepaidLocal, total: prepaidFed + prepaidLocal, auto },
    dueFed,
    dueLocal,
    dueTotal,
    notes,
  };
}
