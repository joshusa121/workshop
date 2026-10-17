import type { Basis } from "./sources";

export type Traced = { value: number; label: string; steps: string[]; basis: Basis[] };

export function traced(label: string, value: number, steps: string[], basis: Basis[]): Traced {
  return { value, label, steps, basis };
}

/** 여러 Traced를 합산하며 근거를 병합 */
export function sumTraced(label: string, parts: Traced[]): Traced {
  return {
    label,
    value: parts.reduce((a, p) => a + p.value, 0),
    steps: parts.map((p) => `${p.label}: ${p.value.toLocaleString("ko-KR")}원`),
    basis: parts.flatMap((p) => p.basis),
  };
}
