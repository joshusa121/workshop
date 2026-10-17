import { formatWon } from "../won";
import type { ScenarioResult } from "./scenario";

const abs = (n: number) => formatWon(Math.abs(n));

/** 개인 vs 법인 결과를 2~3문장으로 풀어 쓴다. 숫자는 결과 표와 같은 값. 용어는 docs/verified/plain-terms.md */
export function explainCompare(indiv: ScenarioResult, corp: ScenarioResult, includeFamily = false): string[] {
  const key = includeFamily ? "combinedNetWorthWithFamily" : "combinedNetWorth";
  const d1 = corp.ownerDisposable.value - indiv.ownerDisposable.value;
  const d2 = corp[key].value - indiv[key].value;
  const combinedLabel = includeFamily ? "합산 순자산(가족 실수령 포함)" : "합산 순자산";
  const d3 = indiv.totalBurden.value - corp.totalBurden.value;
  const out: string[] = [];

  out.push(`법인으로 바꾸면 총 부담은 ${abs(d3)} ${d3 >= 0 ? "줄어듭니다" : "늘어납니다"}.`);

  if (d1 < 0 && d2 > 0) {
    out.push(
      `그런데 대표 손에 남는 돈은 ${abs(d1)} 적습니다 — 회사에 남겨둔 이익 ${formatWon(corp.corpRetained.value)}이 법인에 있기 때문입니다. 대표와 회사를 합친 ${includeFamily ? "순자산(가족 실수령 포함)" : "순자산"}으로는 법인이 ${abs(d2)} 앞섭니다.`,
    );
  } else if (d1 >= 0 && d2 >= 0) {
    out.push(`대표 손에 남는 돈도 ${abs(d1)}, ${combinedLabel}도 ${abs(d2)} 법인이 앞섭니다.`);
  } else if (d1 < 0 && d2 <= 0) {
    out.push(`대표 손에 남는 돈 ${abs(d1)}, ${combinedLabel} ${abs(d2)} 모두 개인 유지가 앞섭니다.`);
  } else {
    out.push(`대표 손에 남는 돈은 법인이 ${abs(d1)} 앞서지만 ${combinedLabel}은 개인이 ${abs(d2)} 앞섭니다.`);
  }

  if (corp.deferredTaxEst.value > 0) {
    out.push(`회사에 남겨둔 이익을 나중에 꺼내면 세금 약 ${formatWon(corp.deferredTaxEst.value)}이 더 붙습니다.`);
  }
  return out;
}
