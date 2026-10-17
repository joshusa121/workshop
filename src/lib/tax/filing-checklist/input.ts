export const PROFILES = { general: "개인 일반사업자", simplified: "개인 간이과세자", sincere: "성실신고확인 대상", freelancer: "프리랜서", mixed: "근로·사업 겸업" } as const;
export const METHODS = { simple: "간편장부로 신고", double: "복식부기로 신고", estimate: "장부 없이 추계 신고" } as const;
export const ITEM_IDS = ["return", "income", "balance", "profit", "annex", "trial", "adjustment", "simple", "estimate", "deductions", "expenses", "receipts", "sincere", "withholding"] as const;
export type ItemId = typeof ITEM_IDS[number];
export const STATUSES = { pending: "미준비", ready: "준비 완료", unnecessary: "불필요 (직접 판단)" } as const;
export type ItemStatus = keyof typeof STATUSES;
export type ChecklistInput = {
  year: 2026;
  profile: keyof typeof PROFILES;
  method: keyof typeof METHODS;
  previousRevenue: number;
  largestOtherReceipt: number;
  newBusiness: boolean;
  settledBusinessOnly: boolean;
  claimsDeductions: boolean;
  specialExpenses: boolean;
  statuses: Partial<Record<ItemId, ItemStatus>>;
};
export const DEFAULT_INPUT: ChecklistInput = { year: 2026, profile: "general", method: "simple", previousRevenue: 0, largestOtherReceipt: 0, newBusiness: false, settledBusinessOnly: false, claimsDeductions: false, specialExpenses: false, statuses: {} };
// 세법상 상한이 아닌 공유·입력 데이터의 안전 한도.
const MAX_AMOUNT = 1_000_000_000_000;
const amount = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= MAX_AMOUNT;
export function validateInput(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["입력값이 없습니다."];
  const i = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (i.year !== 2026) errors.push("2026년 귀속만 지원합니다.");
  if (typeof i.profile !== "string" || !Object.hasOwn(PROFILES, i.profile)) errors.push("신고 유형을 선택해 주세요.");
  if (typeof i.method !== "string" || !Object.hasOwn(METHODS, i.method)) errors.push("신고방식을 선택해 주세요.");
  if (!amount(i.previousRevenue) || !amount(i.largestOtherReceipt)) errors.push("금액은 음수·소수 없이 입력해 주세요. 입력 상한은 1조원입니다.");
  for (const k of ["newBusiness", "settledBusinessOnly", "claimsDeductions", "specialExpenses"]) if (typeof i[k] !== "boolean") errors.push("선택 항목을 확인해 주세요.");
  if (!i.statuses || typeof i.statuses !== "object" || Array.isArray(i.statuses) || Object.entries(i.statuses).some(([k, v]) => !ITEM_IDS.includes(k as ItemId) || typeof v !== "string" || !Object.hasOwn(STATUSES, v))) errors.push("서류 준비 상태를 확인해 주세요.");
  return errors;
}
