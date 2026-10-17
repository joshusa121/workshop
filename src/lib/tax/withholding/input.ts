export type IncomeKind = "business" | "other" | "interest" | "dividend";
export type OtherCategory = "lecture" | "prize" | "reward";
export type PaymentCycle = "monthly" | "halfYearApproved";

export type WithholdingInput = {
  kind: IncomeKind;
  /** 한 계약·지급 원인에 해당하는 세전 지급액(원). */
  gross: number;
  otherCategory: OtherCategory;
  actualExpenses: number;
  paidAt: string;
  paymentCycle: PaymentCycle;
};

export const DEFAULT_WITHHOLDING: WithholdingInput = {
  kind: "business", gross: 1_000_000, otherCategory: "lecture", actualExpenses: 0,
  paidAt: "2026-10-17", paymentCycle: "monthly",
};
export const KIND_LABELS: Record<IncomeKind, string> = {
  business: "사업소득 · 계속·반복적 인적용역", other: "기타소득 · 일시적 용역·상금·사례금",
  interest: "일반 이자소득", dividend: "일반 배당소득",
};
export const OTHER_LABELS: Record<OtherCategory, string> = {
  lecture: "일시적 인적용역 (강연 등)", prize: "순위 경쟁대회 입상 상금", reward: "사례금",
};
// 계산 정밀도와 브라우저 입력을 위한 제품 한도. 세법상 한도가 아니다.
export const MAX_AMOUNT = 1_000_000_000_000;
export function isCalendarDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)
    && Number.isFinite(Date.parse(`${s}T00:00:00Z`))
    && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
}
export function isWithholdingInput(value: unknown): value is WithholdingInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const amount = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= MAX_AMOUNT;
  return ["business", "other", "interest", "dividend"].includes(v.kind as string)
    && ["lecture", "prize", "reward"].includes(v.otherCategory as string)
    && ["monthly", "halfYearApproved"].includes(v.paymentCycle as string)
    && amount(v.gross) && amount(v.actualExpenses) && v.actualExpenses <= v.gross
    && isCalendarDate(v.paidAt) && v.paidAt >= "2026-01-01" && v.paidAt <= "2026-12-31";
}
