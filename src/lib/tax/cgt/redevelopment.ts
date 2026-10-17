/**
 * 재건축·재개발 양도차익 2분법 (시행령 §166①②) + 장특공제 보유기간 (§166⑤).
 * 원조합원만 계산한다. 승계조합원은 cgt.ts에서 단순 계산 + "Josh 감수" 표시.
 * 전제: 입력의 capitalExpenditure는 기존건물분 필요경비, transferCost는 양도 시 비용으로 본다.
 */
import { floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import type { CgtInput, Redevelopment } from "./input";
import { fullYears } from "./period";
import { REDEVELOPMENT_FORMULA } from "./rates-cgt";

export type RedevelopmentGains = {
  /** 관리처분 후 양도차익 (입주권·신축주택 공통 가목) */
  afterApproval: Traced;
  /** 관리처분 전 양도차익 (청산금 수령 시 안분 반영) */
  beforeApproval: Traced;
  /** 신축주택 + 청산금 납부 시: 청산금납부분 양도차익 */
  settlementPortion?: Traced;
  /** 신축주택 + 청산금 납부 시: 기존건물분 양도차익(관리처분 후 안분 + 관리처분 전) */
  existingPortion?: Traced;
  /** 장특공제를 적용할 (양도차익, 보유연수) 묶음 */
  ltcgParts: { label: string; gain: number; holdYears: number }[];
  /** 장특공제 대상이 아닌 양도차익 합 */
  noLtcgGain: number;
  total: number;
  unverified: string[];
};

export function redevelopmentGains(input: CgtInput, rd: Redevelopment): RedevelopmentGains {
  const s = input.subject;
  const B = REDEVELOPMENT_FORMULA.basis;
  const won = (n: number) => n.toLocaleString("ko-KR");
  const paid = rd.settlement.type === "paid" ? rd.settlement.amount : 0;
  const received = rd.settlement.type === "received" ? rd.settlement.amount : 0;
  const unverified: string[] = [];

  // 가. 관리처분 후 양도차익
  const afterRaw = s.transferPrice - (rd.appraisal + paid - received) - s.transferCost;
  const afterApproval = traced(
    "관리처분 후 양도차익",
    Math.trunc(afterRaw),
    [
      paid > 0
        ? `양도가액 ${won(s.transferPrice)} − (평가액 ${won(rd.appraisal)} + 납부 청산금 ${won(paid)}) − 양도비 ${won(s.transferCost)}`
        : `양도가액 ${won(s.transferPrice)} − (평가액 ${won(rd.appraisal)} − 수령 청산금 ${won(received)}) − 양도비 ${won(s.transferCost)}`,
    ],
    [B],
  );

  // 나. 관리처분 전 양도차익
  const beforeBase = rd.appraisal - s.acquisitionPrice - s.capitalExpenditure;
  const ratio = received > 0 && rd.appraisal > 0 ? (rd.appraisal - received) / rd.appraisal : 1;
  const beforeApproval = traced(
    "관리처분 전 양도차익",
    Math.trunc(beforeBase * ratio),
    [
      `평가액 ${won(rd.appraisal)} − 기존주택 취득가 ${won(s.acquisitionPrice)} − 필요경비 ${won(s.capitalExpenditure)} = ${won(beforeBase)}`,
      ...(received > 0 ? [`× (평가액 − 수령 청산금) ÷ 평가액 = × ${(ratio * 100).toFixed(4)}% (시행령 §166①2호 나목)`] : []),
    ],
    [B],
  );

  const holdBefore = fullYears(s.acquiredAt, rd.approvalDate);
  const holdAll = fullYears(s.acquiredAt, s.transferredAt);
  const holdAfter = fullYears(rd.approvalDate, s.transferredAt);

  if (!rd.transferAsNewHouse) {
    // 입주권 양도: 장특공제는 관리처분 전 양도차익에 한정 (§95②), 보유기간 취득일~인가일 (§166⑤1호)
    return {
      afterApproval,
      beforeApproval,
      ltcgParts: [{ label: "관리처분 전 양도차익", gain: beforeApproval.value, holdYears: holdBefore }],
      noLtcgGain: afterApproval.value,
      total: afterApproval.value + beforeApproval.value,
      unverified,
    };
  }

  // 신축주택 양도
  if (paid > 0) {
    const denom = rd.appraisal + paid;
    const settlementPortion = traced(
      "청산금납부분 양도차익",
      floorWon(afterApproval.value * (paid / denom)),
      [`관리처분 후 양도차익 ${won(afterApproval.value)} × 납부 청산금 ${won(paid)} ÷ (평가액 + 청산금) ${won(denom)}`],
      [B],
    );
    const existingPortion = traced(
      "기존건물분 양도차익",
      floorWon(afterApproval.value * (rd.appraisal / denom)) + beforeApproval.value,
      [
        `관리처분 후 양도차익 ${won(afterApproval.value)} × 평가액 ${won(rd.appraisal)} ÷ ${won(denom)} + 관리처분 전 양도차익 ${won(beforeApproval.value)}`,
      ],
      [B],
    );
    return {
      afterApproval,
      beforeApproval,
      settlementPortion,
      existingPortion,
      ltcgParts: [
        { label: "청산금납부분(인가일~양도일)", gain: settlementPortion.value, holdYears: holdAfter },
        { label: "기존건물분(취득일~양도일)", gain: existingPortion.value, holdYears: holdAll },
      ],
      noLtcgGain: 0,
      total: settlementPortion.value + existingPortion.value,
      unverified,
    };
  }
  // 신축주택 + 청산금 수령(또는 없음): §166②2호 → ①2호 금액. 보유기간은 ⑤1호(전 양도차익: 취득일~인가일) 적용,
  // 관리처분 후 양도차익의 보유기간은 조문에 명시가 없어 인가일~양도일로 둔다.
  unverified.push("신축주택 양도 + 청산금 수령 시 관리처분 후 양도차익의 장특공제 보유기간(인가일~양도일 가정)은 조문에 명시가 없습니다 — 세무사 확인이 필요합니다.");
  return {
    afterApproval,
    beforeApproval,
    ltcgParts: [
      { label: "관리처분 후 양도차익(인가일~양도일)", gain: afterApproval.value, holdYears: holdAfter },
      { label: "관리처분 전 양도차익(취득일~인가일)", gain: beforeApproval.value, holdYears: holdBefore },
    ],
    noLtcgGain: 0,
    total: afterApproval.value + beforeApproval.value,
    unverified,
  };
}
