import { applyBrackets } from "./progressive";
import { BASIC_DEDUCTION_SELF, INCOME_TAX_BRACKETS, LOCAL_TAX_RATE } from "./rates";
import { floorTenWon, floorWon } from "./rounding";
import { LOCAL_TAX_DETERMINED_BASIS } from "./sources";
import { traced, type Traced } from "./trace";

export function computeIncomeTax(
  businessIncome: number,
  otherIncome: number,
  deductions: number,
): { taxBase: Traced; incomeTax: Traced; localTax: Traced } {
  const raw = businessIncome + otherIncome - deductions;
  const base = floorWon(Math.max(0, raw));
  const taxBase = traced(
    "종합소득과세표준",
    base,
    [
      `사업소득 ${businessIncome.toLocaleString("ko-KR")} + 타소득 ${otherIncome.toLocaleString("ko-KR")} − 공제 ${deductions.toLocaleString("ko-KR")} = ${raw.toLocaleString("ko-KR")}`,
      raw < 0 ? "음수 과표는 0" : "과표 1원 미만 버림",
    ],
    [BASIC_DEDUCTION_SELF.basis],
  );
  const incomeTax = applyBrackets(base, INCOME_TAX_BRACKETS, "종합소득 산출세액", floorTenWon);
  // 세액공제 미반영 → 결정세액 = 산출세액. 개인지방소득세는 결정세액 × 10% (지특법 §167의2①)
  const localRaw = incomeTax.value * LOCAL_TAX_RATE.value;
  const localTax = traced(
    "개인지방소득세 (결정세액 × 10%)",
    floorTenWon(localRaw),
    [`결정세액(=산출세액, 세액공제 미반영) ${incomeTax.value.toLocaleString("ko-KR")} × 10% = ${localRaw.toLocaleString("ko-KR")}`],
    [LOCAL_TAX_RATE.basis, LOCAL_TAX_DETERMINED_BASIS],
  );
  return { taxBase, incomeTax, localTax };
}
