import { floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import {
  GENERAL_FORMULA_BASIS,
  INDUSTRY_LABEL,
  SIMPLE_APPLY_THRESHOLD,
  SIMPLE_EXEMPT_THRESHOLD,
  SIMPLE_FORMULA_BASIS,
  SIMPLE_INPUT_CREDIT_RATE,
  SIMPLE_VALUE_RATE,
  VAT_RATE,
  type VatIndustry,
} from "./rates-vat";
import { normalizeVat, supplyValue, type VatInput } from "./input";

export type VatResult = {
  outputTax: Traced;
  inputTax: Traced;
  generalTax: Traced;
  simpleBase: Traced;
  simpleInputCredit: Traced;
  simpleTax: Traced;
  simpleEligible: boolean;
  simpleExempt: boolean;
  diff: number;
  recommend: "general" | "simple" | "same";
  valueRate: number;
  industry: VatIndustry;
  industryLabel: string;
  notes: string[];
};

export function computeVat(input: VatInput): VatResult {
  const i = normalizeVat(input);
  const valueRate = SIMPLE_VALUE_RATE.value[i.industry];
  const notes: string[] = [];

  // 일반과세: 매출세액 = 공급가액 × 10%, 매입세액 = 매입 공급가액 × 10%
  const outValue = floorWon(supplyValue(i.annualRevenue) * VAT_RATE.value);
  const inValue = floorWon(supplyValue(i.purchaseWithInvoice) * VAT_RATE.value);
  const outputTax = traced(
    "매출세액 (일반과세)",
    outValue,
    [`매출 공급대가 ${i.annualRevenue.toLocaleString("ko-KR")} ÷ 1.1 = 공급가액 ${Math.round(supplyValue(i.annualRevenue)).toLocaleString("ko-KR")} × 10%`],
    [VAT_RATE.basis],
  );
  const inputTax = traced(
    "매입세액 (일반과세)",
    inValue,
    [`매입 공급대가 ${i.purchaseWithInvoice.toLocaleString("ko-KR")} ÷ 1.1 × 10%`],
    [VAT_RATE.basis],
  );
  const generalValue = outValue - inValue;
  const generalTax = traced(
    "일반과세 납부세액",
    generalValue,
    [`매출세액 ${outValue.toLocaleString("ko-KR")} − 매입세액 ${inValue.toLocaleString("ko-KR")} = ${generalValue.toLocaleString("ko-KR")}`, generalValue < 0 ? "음수면 환급세액" : "납부"],
    [GENERAL_FORMULA_BASIS],
  );

  // 간이과세: 납부세액 = 공급대가 × 부가가치율 × 10%
  const simpleBaseValue = floorWon(i.annualRevenue * valueRate * VAT_RATE.value);
  const simpleBase = traced(
    "간이과세 납부세액(공제 전)",
    simpleBaseValue,
    [`공급대가 ${i.annualRevenue.toLocaleString("ko-KR")} × 부가가치율 ${(valueRate * 100).toFixed(0)}% × 10%`],
    [SIMPLE_FORMULA_BASIS, SIMPLE_VALUE_RATE.basis],
  );
  const creditValue = floorWon(i.purchaseWithInvoice * SIMPLE_INPUT_CREDIT_RATE.value);
  const simpleInputCredit = traced(
    "세금계산서 매입 세액공제",
    creditValue,
    [`세금계산서 수취 매입 공급대가 ${i.purchaseWithInvoice.toLocaleString("ko-KR")} × 0.5%`],
    [SIMPLE_INPUT_CREDIT_RATE.basis],
  );

  const simpleEligible = i.annualRevenue < SIMPLE_APPLY_THRESHOLD.value;
  const simpleExempt = i.annualRevenue < SIMPLE_EXEMPT_THRESHOLD.value;
  const simpleNet = Math.max(0, simpleBaseValue - creditValue);
  const simpleValue = simpleExempt ? 0 : simpleNet;
  const simpleTax = traced(
    "간이과세 납부세액",
    simpleValue,
    [
      `공제 전 ${simpleBaseValue.toLocaleString("ko-KR")} − 매입 세액공제 ${creditValue.toLocaleString("ko-KR")} = ${simpleNet.toLocaleString("ko-KR")}`,
      simpleExempt ? "공급대가 4,800만원 미만 → 납부의무 면제(§69①)" : "납부",
      simpleEligible ? "" : "직전 연도 공급대가 1억 400만원 이상 → 간이과세 적용 대상 아님(참고값)",
    ].filter(Boolean),
    [SIMPLE_FORMULA_BASIS, SIMPLE_INPUT_CREDIT_RATE.basis, SIMPLE_EXEMPT_THRESHOLD.basis],
  );

  const diff = simpleValue - generalValue;
  const recommend: VatResult["recommend"] = diff < 0 ? "simple" : diff > 0 ? "general" : "same";

  if (!simpleEligible) notes.push("연 매출이 1억 400만원 이상이라 간이과세를 선택할 수 없습니다(일반과세만 가능). 부가가치세법 §61①.");
  if (simpleExempt) notes.push("연 매출이 4,800만원 미만이라 간이과세는 납부의무가 면제됩니다(§69①). 다만 세금계산서 발급 등 다른 의무는 남습니다.");
  notes.push(
    "매출·매입 금액은 부가가치세 포함(공급대가)으로 입력한 전제입니다.",
    "간이과세 부가가치율은 업종 평균으로, 직전 3년 신고 실적에 따라 달라질 수 있습니다(시행령 §111②).",
    "신용카드·현금영수증·전자세금계산서 세액공제, 영세율·면세, 의제매입세액, 가산세는 반영하지 않았습니다.",
    "신고기한: 예정 4/25·10/25, 확정 7/25·다음해 1/25 (부가가치세법 제48조·제49조).",
  );

  return {
    outputTax,
    inputTax,
    generalTax,
    simpleBase,
    simpleInputCredit,
    simpleTax,
    simpleEligible,
    simpleExempt,
    diff,
    recommend,
    valueRate,
    industry: i.industry,
    industryLabel: INDUSTRY_LABEL[i.industry],
    notes,
  };
}
