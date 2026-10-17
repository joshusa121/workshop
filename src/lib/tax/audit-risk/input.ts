export type AuditRiskInput = {
  entity: "individual" | "corporation";
  annualRevenue: number;
  totalExpenses: number;
  cashRevenuePercent: number;
  suspectedFakeExpensePercent: number;
  ownerAdvance: number;
  entertainmentExcess: number;
  undocumentedPurchases: number;
  compliance: "met" | "unmet" | "unknown";
};

export const DEFAULT_AUDIT_RISK_INPUT: AuditRiskInput = {
  entity: "individual", annualRevenue: NaN, totalExpenses: NaN,
  cashRevenuePercent: NaN, suspectedFakeExpensePercent: NaN,
  ownerAdvance: 0, entertainmentExcess: NaN, undocumentedPurchases: NaN, compliance: "unknown",
};
export const SAMPLE_AUDIT_RISK_INPUT: AuditRiskInput = {
  entity: "corporation", annualRevenue: 100_000_000, totalExpenses: 40_000_000,
  cashRevenuePercent: 37.5, suspectedFakeExpensePercent: 12.5,
  ownerAdvance: 10_000_000, entertainmentExcess: 2_000_000, undocumentedPurchases: 3_000_000, compliance: "unmet",
};

export function auditRiskInputErrors(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["입력 형식을 확인해 주세요."];
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (r.entity !== "individual" && r.entity !== "corporation") errors.push("개인·법인 구분을 선택해 주세요.");
  for (const [key, label] of [["annualRevenue", "총수입금액"], ["totalExpenses", "장부에 반영한 경비 총액"], ["ownerAdvance", "대표 가지급금"], ["entertainmentExcess", "기업업무추진비 한도초과액"], ["undocumentedPurchases", "무자료 매입액"]]) {
    const n = r[key];
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0 || n > 10_000_000_000_000) errors.push(`${label}을 음수가 아닌 정수 원으로 입력해 주세요(최대 10조원).`);
  }
  for (const [key, label] of [["cashRevenuePercent", "현금수입 비중"], ["suspectedFakeExpensePercent", "가공경비 의심 비중"]]) {
    const n = r[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100 || Math.abs(n * 100 - Math.round(n * 100)) > 1e-8) errors.push(`${label}은 0~100%, 소수 둘째 자리까지 입력해 주세요.`);
  }
  if (r.annualRevenue === 0 && typeof r.cashRevenuePercent === "number" && r.cashRevenuePercent > 0) errors.push("총수입금액이 없으면 현금수입 비중은 0으로 입력해 주세요.");
  if (r.totalExpenses === 0 && typeof r.suspectedFakeExpensePercent === "number" && r.suspectedFakeExpensePercent > 0) errors.push("경비가 없으면 가공경비 의심 비중은 0으로 입력해 주세요.");
  if (typeof r.totalExpenses === "number") {
    if (typeof r.entertainmentExcess === "number" && r.entertainmentExcess > r.totalExpenses) errors.push("한도초과액은 경비 총액을 넘을 수 없습니다.");
    if (typeof r.undocumentedPurchases === "number" && r.undocumentedPurchases > r.totalExpenses) errors.push("무자료 매입액은 경비 총액을 넘을 수 없습니다.");
  }
  if (r.entity === "individual" && r.ownerAdvance !== 0) errors.push("개인사업자는 법인 대표 가지급금 항목에 0을 입력해 주세요.");
  if (!["met", "unmet", "unknown"].includes(r.compliance as string)) errors.push("신고·확인서 의무 이행 상태를 선택해 주세요.");
  return errors;
}
export function isAuditRiskInput(raw: unknown): raw is AuditRiskInput { return auditRiskInputErrors(raw).length === 0; }
