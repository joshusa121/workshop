import { applyBrackets } from "./progressive";
import { CORP_TAX_BRACKETS, LOCAL_TAX_RATE } from "./rates";
import { floorTenWon, floorWon } from "./rounding";
import { traced, type Traced } from "./trace";

export function computeCorpTax(taxBase: number): { corpTax: Traced; localTax: Traced } {
  const base = floorWon(Math.max(0, taxBase));
  const corpTax = applyBrackets(base, CORP_TAX_BRACKETS, "법인세 산출세액", floorTenWon);
  const localRaw = corpTax.value * LOCAL_TAX_RATE.value;
  const localTax = traced(
    "법인지방소득세 (산출세액 × 10%)",
    floorTenWon(localRaw),
    [`산출세액 ${corpTax.value.toLocaleString("ko-KR")} × 10% = ${localRaw.toLocaleString("ko-KR")}`],
    [LOCAL_TAX_RATE.basis],
  );
  return { corpTax, localTax };
}
