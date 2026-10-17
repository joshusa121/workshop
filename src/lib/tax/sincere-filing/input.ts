export type RevenueGroups = [number, number, number];
export type SincereInput = {
  year: 2026;
  current: RevenueGroups;
  previous: RevenueGroups;
  newBusiness: boolean;
  excludedFromSimple: boolean;
  needsReview: boolean;
  submitted: boolean;
  confirmationCost: number;
};
export const DEFAULT_INPUT: SincereInput = {
  year: 2026, current: [0, 0, 0], previous: [0, 0, 0], newBusiness: false,
  excludedFromSimple: false, needsReview: false, submitted: false, confirmationCost: 0,
};
// 공유 URL·입력의 안전 상한이며 세법상 기준이 아닙니다.
export const MAX_AMOUNT = 1_000_000_000_000;
const money = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 0 && x <= MAX_AMOUNT;
export function validateInput(raw: unknown): string[] {
  if (typeof raw !== "object" || raw === null) return ["입력 데이터가 없습니다."];
  const i = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (i.year !== 2026) errors.push("2026년 귀속만 지원합니다.");
  for (const k of ["current", "previous"] as const) {
    if (!Array.isArray(i[k]) || i[k].length !== 3 || !i[k].every(money)) errors.push("수입금액은 업종군별로 빠짐없이 원 단위 정수로 입력해 주세요. 음수·소수·입력 상한 초과는 사용할 수 없습니다.");
  }
  if (!money(i.confirmationCost)) errors.push("확인비용을 올바른 원 단위 금액으로 입력해 주세요.");
  for (const k of ["newBusiness", "excludedFromSimple", "needsReview", "submitted"]) {
    if (typeof i[k] !== "boolean") errors.push("선택 항목을 확인해 주세요.");
  }
  return errors;
}
