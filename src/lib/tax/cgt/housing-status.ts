/**
 * 세대 보유 현황 → 1세대 1주택 / 일시적 2주택 / 특례 1주택 / 다주택 판정.
 * 판정 근거를 reasons에 문장으로 남긴다. 세율·비과세 계산은 하지 않는다.
 */
import type { Basis } from "../sources";
import type { CgtInput, OtherHolding } from "./input";
import { addYears, describeSpan, withinYearsLastDay } from "./period";
import { MERGER_SPECIAL_YEARS, PRESALE_COUNT_FROM, RIGHT_EXEMPTION, TEMPORARY_TWO_HOUSES } from "./rates-cgt";

export type StatusCategory =
  | "one_house" // 1세대 1주택
  | "temporary_two" // 일시적 2주택 (§155①·§156의2③·§156의3②)
  | "special_one" // 상속·혼인·동거봉양 특례로 1주택으로 봄
  | "multi" // 2주택 이상 (특례 미충족 포함)
  | "right" // 조합원입주권 양도
  | "presale"; // 분양권 양도

export type SurchargeCandidate = "none" | "two" | "three";

export type HousingStatus = {
  category: StatusCategory;
  /** 주택 수 (양도 자산 포함; 입주권·2021년 이후 취득 분양권 산입) */
  houseCount: number;
  /** §154①(1세대 1주택 비과세 요건) 판정 대상인가 */
  treatedAsOneHouse: boolean;
  /** 입주권 양도 시 §89①4호 가·나목 구조 요건 충족 여부 */
  rightStructureOk: boolean;
  /** 조정대상지역 다주택 중과 후보 (§104⑦). 유예·경과조치 적용은 cgt.ts */
  surchargeCandidate: SurchargeCandidate;
  reasons: string[];
  basis: Basis[];
  /** "n년 이내" 기한(withinYearsLastDay)을 판정에 썼는가 — 일시적 2주택·입주권 3년, 혼인·동거봉양 10년. 기한 계산 방식 세무사 확인 표시용 */
  deadlineRuleUsed: boolean;
};

/** 주택 수에 산입되는 보유분인지 (분양권은 2021-01-01 이후 취득분만) */
export function countsAsHouse(h: OtherHolding): boolean {
  if (h.kind === "presale") return h.acquiredAt >= PRESALE_COUNT_FROM.value;
  return true;
}

export function assessHousingStatus(input: CgtInput): HousingStatus {
  const { subject, household } = input;
  const counted = household.others.filter(countsAsHouse);
  const skipped = household.others.length - counted.length;
  const reasons: string[] = [];
  const basis: Basis[] = [];
  let deadlineRuleUsed = false;
  if (skipped > 0) {
    reasons.push(`2021년 1월 1일 전에 취득한 분양권 ${skipped}건은 주택 수에 넣지 않습니다.`);
    basis.push(PRESALE_COUNT_FROM.basis);
  }
  const houseCount = 1 + counted.length;

  if (subject.kind === "presale") {
    return {
      category: "presale",
      houseCount,
      treatedAsOneHouse: false,
      rightStructureOk: false,
      surchargeCandidate: "none",
      deadlineRuleUsed,
      reasons: [...reasons, "분양권 양도는 1세대 1주택 비과세 대상이 아닙니다(주택이 아님)."],
      basis,
    };
  }

  if (subject.kind === "right") {
    const others = counted;
    let ok = false;
    if (others.length === 0) {
      ok = true;
      reasons.push("양도일 현재 다른 주택·분양권이 없습니다(소득세법 §89①4호 가목).");
    } else if (others.length === 1 && others[0].kind === "house") {
      deadlineRuleUsed = true;
      const limit = withinYearsLastDay(others[0].acquiredAt, RIGHT_EXEMPTION.value.disposeWithinYears);
      ok = subject.transferredAt <= limit;
      reasons.push(
        ok
          ? `1주택(${others[0].acquiredAt} 취득)을 취득한 날부터 3년 이내(${limit}까지)에 입주권을 양도합니다(§89①4호 나목).`
          : `1주택(${others[0].acquiredAt} 취득)을 취득한 날부터 3년 이내(${limit}까지)를 넘겨 입주권을 양도합니다 — §89①4호 나목 미충족.`,
      );
    } else {
      reasons.push("입주권 외에 주택·분양권을 2개 이상 보유해 §89①4호 요건에 맞지 않습니다.");
    }
    basis.push(RIGHT_EXEMPTION.basis);
    return { category: "right", houseCount, treatedAsOneHouse: false, rightStructureOk: ok, surchargeCandidate: "none", reasons, basis, deadlineRuleUsed };
  }

  // ── 주택 양도 ──
  let category: StatusCategory = "multi";
  let treated = false;

  if (houseCount === 1) {
    category = "one_house";
    treated = true;
    reasons.push("양도일 현재 세대가 보유한 주택은 이 주택 하나입니다.");
  } else if (houseCount === 2) {
    const other = counted[0];
    const sp = household.special;
    if (sp.type === "temporary") {
      const t = TEMPORARY_TWO_HOUSES.value;
      const gapOk = other.acquiredAt >= addYears(subject.acquiredAt, t.minGapYears);
      deadlineRuleUsed = true;
      const limit = withinYearsLastDay(other.acquiredAt, t.disposeWithinYears);
      const withinOk = subject.transferredAt <= limit;
      const what = other.kind === "house" ? "새 주택" : other.kind === "right" ? "조합원입주권" : "분양권";
      reasons.push(
        gapOk
          ? `종전주택 취득(${subject.acquiredAt}) 후 1년이 지나 ${what}을 취득했습니다(${other.acquiredAt}).`
          : `종전주택 취득(${subject.acquiredAt}) 후 1년이 지나기 전에 ${what}을 취득했습니다(${other.acquiredAt}) — 일시적 2주택 요건 미충족.`,
      );
      reasons.push(
        withinOk
          ? `${what} 취득일부터 3년 이내(${limit}까지)에 종전주택을 양도합니다.`
          : `${what} 취득일부터 3년 이내(${limit}까지)를 넘겨 양도합니다 — 일시적 2주택 처분 기한 도과.`,
      );
      basis.push(TEMPORARY_TWO_HOUSES.basis);
      if (gapOk && withinOk) {
        category = "temporary_two";
        treated = true;
      }
    } else if (sp.type === "inherited") {
      const ok = other.inherited === true && other.kind === "house" && subject.acquiredAt < other.acquiredAt;
      reasons.push(
        ok
          ? `상속주택(${other.acquiredAt} 상속) 외의 일반주택(상속 전부터 보유)을 양도하므로 1주택으로 봅니다(시행령 §155②).`
          : "상속주택 특례는 상속 전부터 보유한 일반주택을 양도할 때만 적용됩니다 — 요건 미충족.",
      );
      if (ok) {
        category = "special_one";
        treated = true;
      }
    } else if (sp.type === "marriage" || sp.type === "cohabitation") {
      const label = sp.type === "marriage" ? "혼인" : "동거봉양 합가";
      deadlineRuleUsed = true;
      const limit = withinYearsLastDay(sp.eventDate, MERGER_SPECIAL_YEARS.value);
      const bothBefore = subject.acquiredAt <= sp.eventDate && other.acquiredAt <= sp.eventDate;
      const withinOk = subject.transferredAt <= limit;
      reasons.push(
        bothBefore
          ? `${label}(${sp.eventDate}) 전에 각자 1주택씩 보유하고 있었습니다.`
          : `${label}(${sp.eventDate}) 뒤에 취득한 주택이 있어 특례 구조에 맞지 않습니다.`,
      );
      reasons.push(
        withinOk
          ? `${label}일부터 10년 이내(${limit}까지)에 먼저 양도하는 주택입니다(시행령 §155${sp.type === "marriage" ? "⑤" : "④"}).`
          : `${label}일부터 10년 이내(${limit}까지)를 넘겼습니다 — 특례 기한 도과.`,
      );
      basis.push(MERGER_SPECIAL_YEARS.basis);
      if (bothBefore && withinOk) {
        category = "special_one";
        treated = true;
      }
    } else {
      reasons.push("세대가 2주택(입주권·분양권 포함)을 보유하고 특례 사유가 없습니다.");
    }
  } else {
    reasons.push(`세대가 ${houseCount}주택(입주권·분양권 포함)을 보유합니다.`);
  }

  // 중과 후보 (§104⑦): 양도 당시 조정대상지역 + 특례 미적용 + 주택 수 2 이상 (지방 저가 주택은 제외)
  let surchargeCandidate: SurchargeCandidate = "none";
  if (!treated && subject.adjustedAtTransfer) {
    const n = 1 + counted.filter((h) => !h.nonMetroLowValue).length;
    if (n >= 3) surchargeCandidate = "three";
    else if (n === 2) surchargeCandidate = "two";
    if (surchargeCandidate !== "none") {
      reasons.push(
        `양도 주택이 조정대상지역에 있고 세대 주택 수(지방 저가 주택 제외)가 ${n}이라 다주택 중과 후보입니다(소득세법 §104⑦).`,
      );
    }
  }
  if (treated && subject.adjustedAtTransfer && houseCount >= 2) {
    reasons.push("1세대 1주택 특례가 적용되는 주택이라 조정대상지역이어도 중과하지 않습니다(시행령 §167의10①15호).");
  }

  return { category, houseCount, treatedAsOneHouse: treated, rightStructureOk: false, surchargeCandidate, reasons, basis, deadlineRuleUsed };
}

export function holdingLabel(from: string, to: string): string {
  return describeSpan(from, to);
}
