/**
 * 조정대상지역 다주택 중과 여부 (소득세법 §104⑦) + 유예·경과조치 (영 §167의10①12의2 등).
 * Josh 승인(2026-09-26): 유예는 2026-05-09 양도분까지. 이후는 경과조치(나·다목)만 계약일·허가 신청일로 판정.
 */
import type { Basis } from "../sources";
import type { HousingStatus } from "./housing-status";
import type { CgtInput } from "./input";
import { withinMonthsLastDay } from "./period";
import { CGT_SURCHARGE, SURCHARGE_GRACE } from "./rates-cgt";

export type SurchargeDecision = {
  applies: boolean;
  level: "none" | "two" | "three";
  /** 기본세율에 더할 비율 (0.2 / 0.3) */
  add: number;
  reasons: string[];
  basis: Basis[];
  /** 경과조치 "계약일부터 n개월 이내" 기한(withinMonthsLastDay)을 판정에 썼는가 — 기한 계산 방식 세무사 확인 표시용 */
  deadlineRuleUsed: boolean;
};

const NONE: SurchargeDecision = { applies: false, level: "none", add: 0, reasons: [], basis: [], deadlineRuleUsed: false };

export function decideSurcharge(input: CgtInput, status: HousingStatus, holdYears: number): SurchargeDecision {
  if (status.surchargeCandidate === "none") return NONE;
  const s = input.subject;
  const g = SURCHARGE_GRACE.value;
  const level = status.surchargeCandidate;
  const add = level === "two" ? CGT_SURCHARGE.value.twoHouses : CGT_SURCHARGE.value.threeOrMore;
  const label = level === "two" ? "2주택" : "3주택 이상";
  const reasons: string[] = [];
  const basis: Basis[] = [SURCHARGE_GRACE.basis];
  let deadlineRuleUsed = false;

  const graced = (why: string): SurchargeDecision => ({
    applies: false,
    level,
    add,
    reasons: [...reasons, why, "그래서 중과하지 않고 일반세율과 장기보유특별공제를 적용합니다."],
    basis,
    deadlineRuleUsed,
  });

  if (holdYears >= g.minHoldingYears) {
    if (s.transferredAt <= g.lastTransferDate) {
      return graced(`보유 ${holdYears}년(2년 이상) 주택을 ${g.lastTransferDate} 이전(${s.transferredAt})에 양도해 중과 유예 대상입니다(시행령 §167의10①12의2 가목).`);
    }
    const t = input.transitional;
    if (t) {
      const months = t.sixMonthRegion ? g.windowMonths.sixMonthRegion : g.windowMonths.standard;
      const byWindow = withinMonthsLastDay(t.contractDate, months);
      deadlineRuleUsed = true;
      if (t.landPermit) {
        const appliedOk = !!t.permitAppliedAt && t.permitAppliedAt <= g.lastTransferDate;
        const deadline =
          t.contractDate <= g.lastTransferDate
            ? byWindow
            : t.sixMonthRegion
              ? g.lateContractDeadline.sixMonthRegion
              : g.lateContractDeadline.standard;
        if (appliedOk && s.transferredAt <= deadline) {
          return graced(
            `토지거래허가 대상 주택으로 ${t.permitAppliedAt}에 허가를 신청했고(2026-05-09 이전), ${t.contractDate} 계약 후 ${deadline}까지 양도했습니다(나목 경과조치).`,
          );
        }
        reasons.push(
          appliedOk
            ? `토지거래허가 경과조치 기한(${deadline})을 넘겨 양도했습니다.`
            : "토지거래허가 신청일이 2026-05-09 이전이 아니어서 나목 경과조치에 해당하지 않습니다.",
        );
      } else {
        if (t.contractDate <= g.lastTransferDate && s.transferredAt <= byWindow) {
          return graced(`${t.contractDate}에 계약하고 계약금을 받았고, 계약일부터 ${months}개월 이내(${byWindow}까지)에 양도했습니다(다목 경과조치).`);
        }
        reasons.push(
          t.contractDate <= g.lastTransferDate
            ? `계약일부터 ${months}개월 이내(${byWindow}까지)를 넘겨 양도해 다목 경과조치에 해당하지 않습니다.`
            : "매매계약이 2026-05-10 이후라 다목 경과조치에 해당하지 않습니다.",
        );
      }
    }
    reasons.push(`중과 유예는 ${g.lastTransferDate} 양도분까지로 끝났습니다.`);
  } else {
    reasons.push(`보유 ${holdYears}년 — 2년 미만이라 중과 유예 대상이 아닙니다.`);
  }

  basis.push(CGT_SURCHARGE.basis);
  return {
    applies: true,
    level,
    add,
    reasons: [...reasons, `조정대상지역 ${label} 중과: 기본세율에 ${add * 100}%p를 더하고 장기보유특별공제를 빼지 않습니다(§104⑦·§95②).`],
    basis,
    deadlineRuleUsed,
  };
}
