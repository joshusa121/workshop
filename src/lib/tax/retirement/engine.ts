import { applyBrackets } from "@/lib/tax/progressive";
import { floorWon, floorTenWon } from "@/lib/tax/rounding";
import { traced, type Traced } from "@/lib/tax/trace";
import { validateRetirement, type RetirementInput } from "./input";
import { BASIC_BRACKETS, CONVERTED_BASIS, CONVERTED_DEDUCTION, EXECUTIVE_BASIS, EXECUTIVE_RULE, FORMULA_BASIS, LOCAL_ROUND_BASIS, LOCAL_TAX, MONTHS_PER_YEAR, PERIOD_BASIS, PRE2012_BASIS, ROUND_BASIS, SERVICE_BASIS, SERVICE_DEDUCTION, SMALL_TAX_BASIS } from "./rates-retirement";

export type RetirementResult = {
  amount: Traced; serviceYears: Traced; pre2012Income: Traced; limit2012: Traced; limit2020: Traced;
  executiveLimit: Traced | null; employmentIncome: Traced; retirementIncome: Traced;
  serviceDeduction: Traced; convertedPay: Traced; convertedDeduction: Traced; taxBase: Traced;
  convertedTax: Traced; assessedTax: Traced; tax: Traced; localTax: Traced; total: Traced; netRetirement: Traced;
  review: string[];
};
const n = (v: number) => v.toLocaleString("ko-KR", { maximumFractionDigits: 6 });

export function computeRetirement(i: RetirementInput): RetirementResult {
  const errors = validateRetirement(i);
  if (errors.length) throw new RangeError(errors.join(" "));
  const years = Math.ceil(i.serviceMonths / MONTHS_PER_YEAR);
  const amount = traced("비과세 제외 지급액", i.amount, ["사용자가 입력한 비과세 제외 지급액"], [EXECUTIVE_BASIS]);
  const serviceYears = traced("근속연수", years, [`${n(i.serviceMonths)}개월 ÷ 12, 1년 미만 올림 = ${years}년`], [SERVICE_BASIS, PERIOD_BASIS]);
  const pre = i.isExecutive ? i.amount * i.monthsBefore2012 / i.serviceMonths : 0;
  const pre2012Income = traced("2011년 이전 근무분", pre, [i.isExecutive ? `${n(i.amount)} × ${i.monthsBefore2012}개월 ÷ ${i.serviceMonths}개월 = ${n(pre)}` : "일반 근로자는 임원 한도를 적용하지 않음"], [PRE2012_BASIS]);
  const a = i.isExecutive ? i.annualSalary2019 * EXECUTIVE_RULE.ratio * i.months2012To2019 / MONTHS_PER_YEAR * EXECUTIVE_RULE.multiple2012 : 0;
  const b = i.isExecutive ? i.annualSalaryAtRetirement * EXECUTIVE_RULE.ratio * i.monthsFrom2020 / MONTHS_PER_YEAR * EXECUTIVE_RULE.multiple2020 : 0;
  const limit2012 = traced("2012~2019년 한도", a, [i.isExecutive ? `${n(i.annualSalary2019)} × 1/10 × ${i.months2012To2019}/12 × 3 = ${n(a)}` : "임원 한도 적용 대상 아님"], [EXECUTIVE_BASIS]);
  const limit2020 = traced("2020년 이후 한도", b, [i.isExecutive ? `${n(i.annualSalaryAtRetirement)} × 1/10 × ${i.monthsFrom2020}/12 × 2 = ${n(b)}` : "임원 한도 적용 대상 아님"], [EXECUTIVE_BASIS]);
  const executiveLimit = i.isExecutive ? traced("퇴직소득 인정 한도", pre + a + b, [`${n(pre)} + ${n(a)} + ${n(b)} = ${n(pre + a + b)}`], [EXECUTIVE_BASIS, PRE2012_BASIS]) : null;
  const retirement = Math.min(i.amount, executiveLimit?.value ?? i.amount);
  const retirementIncome = traced("퇴직소득으로 계산하는 금액", retirement, [i.isExecutive ? `지급액과 한도 중 적은 금액 = ${n(retirement)}` : "비과세 제외 지급액 전액"], [EXECUTIVE_BASIS]);
  const employmentIncome = traced("근로소득으로 보는 초과액", i.amount - retirement, [`지급액 ${n(i.amount)} − 퇴직소득 ${n(retirement)}`], [EXECUTIVE_BASIS]);
  const s = SERVICE_DEDUCTION.value.find((r) => r.upTo === null || years <= r.upTo)!;
  const deduction = Math.min(retirement, s.base + s.perYear * (years - s.from));
  const serviceDeduction = traced("근속연수공제", deduction, [`${n(s.base)} + ${n(s.perYear)} × (${years} − ${s.from}), 퇴직소득금액 한도`], [SERVICE_BASIS]);
  // 중간 값은 유지하고 법정 과세표준에서만 1원 미만을 버린다.
  const converted = (retirement - deduction) * MONTHS_PER_YEAR / years;
  const convertedPay = traced("환산급여", converted, [`(${n(retirement)} − ${n(deduction)}) ÷ ${years} × 12 = ${n(converted)}`], [CONVERTED_BASIS]);
  const c = CONVERTED_DEDUCTION.value.find((r) => r.upTo === null || converted <= r.upTo)!;
  const convertedDeduct = c.base + (converted - c.from) * c.rate;
  const convertedDeduction = traced("환산급여공제", convertedDeduct, [`${n(c.base)} + (${n(converted)} − ${n(c.from)}) × ${c.rate * 100}% = ${n(convertedDeduct)}`], [CONVERTED_BASIS]);
  const base = floorWon(converted - convertedDeduct);
  const taxBase = traced("환산 과세표준", base, [`${n(converted)} − ${n(convertedDeduct)}, 1원 미만 버림 = ${n(base)}`], [FORMULA_BASIS, ROUND_BASIS]);
  const convertedTax = applyBrackets(base, BASIC_BRACKETS, "환산 산출세액", (v) => v);
  if (!convertedTax.steps.length) convertedTax.steps.push("과세표준이 0원이므로 산출세액 0원");
  const rawTax = convertedTax.value / MONTHS_PER_YEAR * years;
  const assessedTax = traced("퇴직소득 산출세액 (원 미만 표시 절사)", floorWon(rawTax), [`${n(convertedTax.value)} ÷ 12 × ${years} = ${n(rawTax)}원`, "이 단계는 비교용 표시이며, 납부액에서 10원 미만을 버림"], [FORMULA_BASIS, ROUND_BASIS]);
  const withheld = rawTax < 1_000 ? 0 : floorTenWon(rawTax);
  const tax = traced("퇴직소득세 원천징수액", withheld, [rawTax < 1_000 ? "원천징수세액 1,000원 미만으로 징수하지 않음" : `${n(rawTax)}원에서 10원 미만 버림 = ${n(withheld)}원`], [FORMULA_BASIS, SMALL_TAX_BASIS, ROUND_BASIS]);
  const localTax = traced("지방소득세 특별징수액", floorTenWon(withheld * LOCAL_TAX.value), [`${n(withheld)} × 10%, 10원 미만 버림`], [LOCAL_TAX.basis, LOCAL_ROUND_BASIS]);
  const total = traced("퇴직소득 관련 세금 합계", withheld + localTax.value, [`소득세 ${n(withheld)} + 지방소득세 ${n(localTax.value)}`], [FORMULA_BASIS, LOCAL_TAX.basis]);
  const netRetirement = traced("퇴직소득분 세후 금액", retirement - total.value, [`퇴직소득 ${n(retirement)} − 관련 세금 ${n(total.value)}`, "임원 한도 초과 근로소득은 포함하지 않음"], [EXECUTIVE_BASIS, FORMULA_BASIS, LOCAL_TAX.basis]);
  const review = ["Josh 감수: 실제 원천징수영수증·공식 계산기 대조와 중간 계산의 끝수 처리 관행 확인이 필요합니다."];
  if (i.isExecutive) review.push("Josh 감수: 임원 해당 여부, 구간별 월수 및 비과세를 제외한 연평균 총급여의 원자료 확인이 필요합니다. 초과 근로소득의 세금과 법인 손금 한도는 계산하지 않습니다.");
  if (pre > 0) review.push("Josh 감수: 2011년 말 정관·퇴직급여규정에 따른 금액을 선택하면 결과가 달라집니다. 여기서는 월수 비례 방식만 적용합니다.");
  return { amount, serviceYears, pre2012Income, limit2012, limit2020, executiveLimit, employmentIncome, retirementIncome, serviceDeduction, convertedPay, convertedDeduction, taxBase, convertedTax, assessedTax, tax, localTax, total, netRetirement, review };
}
