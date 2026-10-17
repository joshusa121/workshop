/** 1세대 1주택·조합원입주권 비과세 판정 + 12억 초과분 과세 비율 (§89①3호·4호, 영 §154①·§160) */
import type { Basis } from "../sources";
import type { HousingStatus } from "./housing-status";
import type { CgtInput } from "./input";
import { fullYears } from "./period";
import { HIGH_VALUE_THRESHOLD, ONE_HOUSE_REQUIREMENT, RIGHT_EXEMPTION } from "./rates-cgt";

export type Exemption = {
  /** 비과세 규정 적용(12억 초과분은 과세) */
  exempt: boolean;
  /** 전액 비과세(양도가액 12억 이하) */
  fullyExempt: boolean;
  /** 과세 양도차익 비율 = (양도가액 − 12억) ÷ 양도가액. 비과세 아니면 1 */
  taxableRatio: number;
  reasons: string[];
  basis: Basis[];
};

export function assessExemption(input: CgtInput, status: HousingStatus): Exemption {
  const s = input.subject;
  const reasons: string[] = [];
  const basis: Basis[] = [];
  const req = ONE_HOUSE_REQUIREMENT.value;
  const resideYears = Math.floor(s.residenceMonths / 12);

  const fail = (why: string): Exemption => ({ exempt: false, fullyExempt: false, taxableRatio: 1, reasons: [...reasons, why], basis });

  if (!s.registered) return fail("미등기 양도자산은 비과세를 적용하지 않습니다(소득세법 §89①3호·§104③).");
  if (status.category === "presale") return fail("분양권은 비과세 대상이 아닙니다.");

  if (status.category === "right") {
    basis.push(RIGHT_EXEMPTION.basis);
    if (input.redevelopment?.role !== "original") return fail("승계취득한 입주권(관리처분 후 매수)은 §89①4호 비과세 대상이 아닙니다.");
    if (!status.rightStructureOk) return fail("다른 주택 보유 구조가 §89①4호 가·나목에 맞지 않습니다.");
    const approval = input.redevelopment.approvalDate;
    const holdAtApproval = fullYears(s.acquiredAt, approval);
    if (holdAtApproval < req.holdingYears) return fail(`관리처분인가일(${approval})에 기존 집을 가진 기간이 ${holdAtApproval}년으로 2년이 안 됩니다.`);
    if (s.adjustedAtAcquisition && resideYears < req.residenceYearsIfAdjusted)
      return fail(`조정대상지역에서 산 기존 집인데 산 기간이 ${resideYears}년으로 2년이 안 됩니다.`);
    reasons.push(`관리처분인가일 현재 기존주택이 1세대 1주택 요건(보유 ${holdAtApproval}년${s.adjustedAtAcquisition ? `·거주 ${resideYears}년` : ""})을 갖췄습니다.`);
    return highValue(s.transferPrice, reasons, basis, "조합원입주권");
  }

  if (!status.treatedAsOneHouse) return fail("1세대 1주택(특례 포함)에 해당하지 않아 비과세가 적용되지 않습니다.");

  basis.push(ONE_HOUSE_REQUIREMENT.basis);
  const holdYears = fullYears(s.acquiredAt, s.transferredAt);
  if (holdYears < req.holdingYears) return fail(`가진 기간이 ${holdYears}년으로 2년이 안 돼 비과세를 받을 수 없습니다(시행령 §154①).`);
  reasons.push(`가진 기간이 ${holdYears}년으로 2년 이상입니다.`);
  if (s.adjustedAtAcquisition) {
    if (resideYears < req.residenceYearsIfAdjusted)
      return fail(`살 때 조정대상지역이라 2년 이상 살아야(거주 요건) 하는데 산 기간이 ${s.residenceMonths}개월이라 비과세를 받을 수 없습니다(시행령 §154①).`);
    reasons.push(`살 때 조정대상지역이었고 ${resideYears}년 살아 거주 요건(2년)을 채웠습니다.`);
  } else {
    reasons.push("살 때 조정대상지역이 아니어서 거주 요건은 없습니다.");
  }
  return highValue(s.transferPrice, reasons, basis, "주택");
}

function highValue(price: number, reasons: string[], basis: Basis[], what: string): Exemption {
  const cap = HIGH_VALUE_THRESHOLD.value;
  basis.push(HIGH_VALUE_THRESHOLD.basis);
  if (price <= cap) {
    return { exempt: true, fullyExempt: true, taxableRatio: 0, reasons: [...reasons, `판 값 ${price.toLocaleString("ko-KR")}원이 12억원 이하라 세금이 없습니다.`], basis };
  }
  const ratio = (price - cap) / price;
  return {
    exempt: true,
    fullyExempt: false,
    taxableRatio: ratio,
    reasons: [
      ...reasons,
      `판 값 ${price.toLocaleString("ko-KR")}원이 12억원을 넘는 고가${what}이라, 12억원을 넘는 비율(${(ratio * 100).toFixed(2)}%)만큼만 세금을 매깁니다(시행령 §160).`,
    ],
    basis,
  };
}
