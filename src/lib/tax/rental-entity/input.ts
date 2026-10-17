export type RentalInput = {
  revenue: number;
  expenses: number;
  /** 임대·금융소득 제외, 소득공제 전 종합소득금액 */
  otherIncome: number;
  /** 국내에서 일반 세율로 원천징수된 다른 이자·배당 */
  otherFinancial: number;
  kind: "housing" | "commercial";
  registered: boolean;
  smallCorp: boolean;
  dividendPercent: number;
};
export const DEFAULT_INPUT: RentalInput = {
  revenue: 20_000_000, expenses: 0, otherIncome: 0, otherFinancial: 0,
  kind: "housing", registered: false, smallCorp: true, dividendPercent: 100,
};
export function validateInput(raw: unknown): string[] {
  if (typeof raw !== "object" || raw === null) return ["입력 형식이 올바르지 않습니다"];
  const x = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const [key, label] of [["revenue", "연 임대 총수입"], ["expenses", "연 필요경비"], ["otherIncome", "다른 종합소득금액"], ["otherFinancial", "다른 금융소득"]]) {
    const n = x[key];
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0 || n > 1_000_000_000_000) errors.push(`${label}: 0원 이상 1조원 이하의 정수를 입력하세요.`);
  }
  if (x.kind !== "housing" && x.kind !== "commercial") errors.push("임대 유형을 선택하세요.");
  if (typeof x.registered !== "boolean" || typeof x.smallCorp !== "boolean") errors.push("임대주택·법인 요건을 선택하세요.");
  if (x.kind === "commercial" && x.registered === true) errors.push("등록 주택 특례는 주택만 선택할 수 있습니다.");
  if (typeof x.dividendPercent !== "number" || !Number.isInteger(x.dividendPercent) || x.dividendPercent < 0 || x.dividendPercent > 100) errors.push("배당 비율은 0부터 100까지 정수로 입력하세요.");
  return errors;
}
