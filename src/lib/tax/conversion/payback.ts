import type { Assumptions } from "../assumptions";
import { runCorporate, runIndividual } from "../scenario";
import type { ScenarioInput } from "../scenario-input";
import type { Basis } from "../sources";
import { traced, type Traced } from "../trace";
import { conversionCosts } from "./cost";

export type Payback = {
  oneTimeCost: Traced;
  annualGain: Traced;
  /** 회수 연수(소수 1자리). 연간 이득이 0 이하면 null */
  years: number | null;
  note: string;
};

const REPEAT_ASSUMPTION: Basis = {
  kind: "assumption",
  description: "매년 같은 이익·급여·배당이 반복된다고 가정. 합산 순자산(가처분+유보) 기준",
  editable: true,
};

const won = (n: number) => n.toLocaleString("ko-KR");

/** 전환 일회성 비용 대비 연간 합산 순자산 이득으로 본 회수 기간 */
export function conversionPayback(input: ScenarioInput, a: Assumptions, includeFamily = false): Payback {
  const key = includeFamily ? "combinedNetWorthWithFamily" : "combinedNetWorth";
  const c = conversionCosts(input, a);
  const parts = [c.registrationTaxWithEducation, c.acquisitionTaxAfterRelief, c.sideCost];
  const oneTime = parts.reduce((s, p) => s + p.value, 0);
  const oneTimeCost = traced(
    "전환 일회성 비용",
    oneTime,
    parts.map((p) => `${p.label} ${won(p.value)}`),
    parts.flatMap((p) => p.basis),
  );

  const indiv = runIndividual(input, a);
  const corp = runCorporate(input, a);
  const gain = corp[key].value - indiv[key].value;
  const annualGain = traced(
    includeFamily ? "연간 합산 순자산 차이 (법인 − 개인, 가족 실수령 포함)" : "연간 합산 순자산 차이 (법인 − 개인)",
    gain,
    [
      `법인 ${won(corp[key].value)} − 개인 ${won(indiv[key].value)} = ${won(gain)}`,
      ...(includeFamily ? ["가족 실수령 포함(사용자 선택)"] : []),
    ],
    [REPEAT_ASSUMPTION, ...corp[key].basis, ...indiv[key].basis],
  );

  if (gain <= 0) {
    return { oneTimeCost, annualGain, years: null, note: "합산 순자산 기준으로 법인이 불리 — 회수 없음" };
  }
  const years = oneTime <= 0 ? 0 : Math.round((oneTime / gain) * 10) / 10;
  return {
    oneTimeCost,
    annualGain,
    years,
    note: "합산 순자산 기준. 매년 같은 이익이 반복된다고 가정",
  };
}
