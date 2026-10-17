/** 화면용 기본 입력·예시·보조 계산. 세법 수치는 rates-cgt.ts에만 둔다. */
import type { CgtInput } from "./input";
import { addMonths, endOfMonth, isValidDate } from "./period";
import { FILING_DEADLINE } from "./rates-cgt";

export const EMPTY_CGT_INPUT: CgtInput = {
  subject: {
    kind: "house",
    acquiredAt: "",
    transferredAt: "",
    acquisitionPrice: 0,
    transferPrice: 0,
    capitalExpenditure: 0,
    transferCost: 0,
    residenceMonths: 0,
    adjustedAtAcquisition: false,
    adjustedAtTransfer: false,
    registered: true,
  },
  household: { others: [], special: { type: "none" } },
};

/** 계산에 필요한 최소 입력(날짜 2개, 판 값)이 들어왔는가 */
export function isComplete(input: CgtInput): boolean {
  const s = input.subject;
  if (!isValidDate(s.acquiredAt) || !isValidDate(s.transferredAt)) return false;
  if (s.acquiredAt > s.transferredAt) return false;
  if (s.transferPrice <= 0) return false;
  if (input.household.others.some((o) => !isValidDate(o.acquiredAt))) return false;
  const rd = input.redevelopment;
  if (rd && !isValidDate(rd.approvalDate)) return false;
  return true;
}

/** 입력이 계산 가능한 상태가 아닐 때 무엇을 채워야 하는지 */
export function missingFields(input: CgtInput): string[] {
  const s = input.subject;
  const out: string[] = [];
  if (!isValidDate(s.acquiredAt)) out.push("산 날");
  if (!isValidDate(s.transferredAt)) out.push("판 날");
  if (isValidDate(s.acquiredAt) && isValidDate(s.transferredAt) && s.acquiredAt > s.transferredAt) out.push("판 날이 산 날보다 앞섭니다");
  if (s.transferPrice <= 0) out.push("판 값");
  if (input.household.others.some((o) => !isValidDate(o.acquiredAt))) out.push("다른 집의 산 날");
  if (input.redevelopment && !isValidDate(input.redevelopment.approvalDate)) out.push("관리처분계획인가일");
  return out;
}

/** 예정신고 기한 = 양도일이 속하는 달의 말일부터 2개월 (소득세법 §105①1호) */
export function filingDeadline(transferredAt: string): string {
  const firstOfMonth = `${transferredAt.slice(0, 7)}-01`;
  return endOfMonth(addMonths(firstOfMonth, FILING_DEADLINE.value.monthsAfterMonthEnd));
}

/** 예시 1: 일시적 2주택, 12억 넘는 부분만 과세 (가공값) */
export const SAMPLE_TEMPORARY: CgtInput = {
  subject: {
    kind: "house",
    acquiredAt: "2019-03-15",
    transferredAt: "2026-10-30",
    acquisitionPrice: 700_000_000,
    transferPrice: 1_350_000_000,
    capitalExpenditure: 20_000_000,
    transferCost: 8_000_000,
    residenceMonths: 60,
    adjustedAtAcquisition: false,
    adjustedAtTransfer: true,
    registered: true,
  },
  household: { others: [{ kind: "house", acquiredAt: "2024-02-20" }], special: { type: "temporary" } },
};

/** 예시 2: 조정대상지역 2주택, 유예 끝난 뒤 양도 → 중과 (가공값) */
export const SAMPLE_SURCHARGE: CgtInput = {
  subject: {
    kind: "house",
    acquiredAt: "2020-01-15",
    transferredAt: "2026-09-01",
    acquisitionPrice: 500_000_000,
    transferPrice: 900_000_000,
    capitalExpenditure: 0,
    transferCost: 0,
    residenceMonths: 0,
    adjustedAtAcquisition: false,
    adjustedAtTransfer: true,
    registered: true,
  },
  household: { others: [{ kind: "house", acquiredAt: "2023-06-01" }], special: { type: "none" } },
};
