import { floorWon } from "../rounding";
import { sumTraced, traced, type Traced } from "../trace";
import {
  EXCLUSION_BASIS,
  PRESUMPTION_BASIS,
  PROOF_ABS_CAP,
  PROOF_ITEMS_BASIS,
  PROOF_RATIO_THRESHOLD,
  SMALL_FUNDS_THRESHOLD,
} from "./rates-fs";
import { normalizeFundsSource, type FundsSourceInput } from "./input";

export type FundsSourceResult = {
  provenIncome: Traced;
  provenInheritance: Traced;
  provenDisposal: Traced;
  provenTotal: Traced;
  unproven: Traced;
  threshold: number;
  smallExclusion: boolean;
  exempt: boolean;
  presumptionTarget: number;
  notes: string[];
};

export function computeFundsSource(input: FundsSourceInput): FundsSourceResult {
  const i = normalizeFundsSource(input);
  const notes: string[] = [];

  const provenIncome = traced("① 신고·과세받은 소득금액", floorWon(i.provenIncome), [], [PROOF_ITEMS_BASIS]);
  const provenInheritance = traced("② 신고·과세받은 상속·수증재산", floorWon(i.provenInheritance), [], [PROOF_ITEMS_BASIS]);
  const provenDisposal = traced(
    "③ 재산 처분대가·부채부담 금전(취득 직접 사용)",
    floorWon(i.provenDisposal),
    [],
    [PROOF_ITEMS_BASIS],
  );
  const provenTotal = sumTraced("소명(입증) 금액 합계", [provenIncome, provenInheritance, provenDisposal]);

  const unprovenValue = Math.max(0, floorWon(i.acquisitionValue) - provenTotal.value);
  const unproven = traced(
    "입증되지 않은 금액(부족액)",
    unprovenValue,
    [`취득재산 가액 ${floorWon(i.acquisitionValue).toLocaleString("ko-KR")} − 소명 합계 ${provenTotal.value.toLocaleString("ko-KR")} = ${unprovenValue.toLocaleString("ko-KR")}`],
    [PROOF_ITEMS_BASIS],
  );

  const threshold = Math.min(floorWon(i.acquisitionValue * PROOF_RATIO_THRESHOLD.value), PROOF_ABS_CAP.value);
  const smallExclusion = i.fundsWithin10y < SMALL_FUNDS_THRESHOLD.value;
  const belowThreshold = unprovenValue < threshold;
  const exempt = provenTotal.value >= i.acquisitionValue || belowThreshold || smallExclusion;
  const presumptionTarget = exempt ? 0 : unprovenValue;

  notes.push(
    "소명(입증) 항목은 신고·과세받은 소득, 신고·과세받은 상속·수증재산, 재산 처분대가·부채부담 금전의 취득 직접 사용액 세 가지입니다(시행령 §34①).",
    "실제 소명은 신고서·과세자료·계좌 흐름으로 입증해야 하며, 개별 판단은 세무사 확인이 필요합니다.",
    "배제 여부와 무관하게 소명 자료는 보관하는 것이 안전합니다.",
  );
  if (smallExclusion) notes.push("취득일 전 10년 이내 취득자금이 5천만원 미만이라 증여추정에서 배제됩니다(시행령 §34②).");

  return {
    provenIncome,
    provenInheritance,
    provenDisposal,
    provenTotal,
    unproven,
    threshold,
    smallExclusion,
    exempt,
    presumptionTarget,
    notes,
  };
}
