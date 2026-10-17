export type Category = "general" | "entertainment" | "car" | "asset";
export type ExpenseInput = {
  entity: "corp" | "individual";
  category: Category;
  amount: number;
  businessUse: boolean;
  evidence: "qualified" | "receipt" | "none";
  months: number;
  sme: boolean;
  revenue: number;
  proofExcluded: number;
  culture: number;
  market: number;
  specialCorp: boolean;
  relatedRevenue: boolean;
  depreciation: number;
  logbook: boolean;
  businessPercent: number;
  insured: boolean;
  partialInsurance: boolean;
  plateCompliant: boolean;
  fullYearCar: boolean;
  taxDepreciation: number;
};

export const DEFAULT_INPUT: ExpenseInput = {
  entity: "corp", category: "general", amount: 100_000, businessUse: true, evidence: "qualified",
  months: 12, sme: true, revenue: 0, proofExcluded: 0, culture: 0, market: 0,
  specialCorp: false, relatedRevenue: false, depreciation: 0, logbook: false,
  businessPercent: 100, insured: true, partialInsurance: false, plateCompliant: true, fullYearCar: true, taxDepreciation: 0,
};
export const CATEGORY_LABELS: Record<Category, string> = {
  general: "일반 지출·증빙", entertainment: "기업업무추진비 (접대비)", car: "업무용승용차", asset: "감가상각비",
};
const moneyKeys = ["amount", "revenue", "proofExcluded", "culture", "market", "depreciation", "taxDepreciation"] as const;
const boolKeys = ["businessUse", "sme", "specialCorp", "relatedRevenue", "logbook", "insured", "partialInsurance", "plateCompliant", "fullYearCar"] as const;

export function validateInput(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["입력값을 확인해 주세요."];
  const x = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (!["corp", "individual"].includes(String(x.entity)) || !Object.keys(CATEGORY_LABELS).includes(String(x.category)) ||
      !["qualified", "receipt", "none"].includes(String(x.evidence))) errors.push("사업자·항목·증빙 종류를 선택해 주세요.");
  if (moneyKeys.some(k => typeof x[k] !== "number" || !Number.isSafeInteger(x[k]) || (x[k] as number) < 0 || (x[k] as number) > 100_000_000_000_000))
    errors.push("금액은 0원부터 100조원 사이의 정수로 입력해 주세요.");
  if (boolKeys.some(k => typeof x[k] !== "boolean")) errors.push("충족 여부를 모두 선택해 주세요.");
  if (typeof x.months !== "number" || !Number.isInteger(x.months) || x.months < 1 || x.months > 12) errors.push("사업연도 개월 수는 1~12로 입력해 주세요.");
  if (typeof x.businessPercent !== "number" || !Number.isFinite(x.businessPercent) || x.businessPercent < 0 || x.businessPercent > 100) errors.push("업무사용 비율은 0~100%로 입력해 주세요.");
  if (x.category === "car" && (x.depreciation as number) > (x.amount as number)) errors.push("감가상각비는 차량 총비용을 넘을 수 없습니다.");
  if (x.category === "entertainment" && ((x.proofExcluded as number) > (x.amount as number) ||
      (x.culture as number) + (x.market as number) > (x.amount as number) - (x.proofExcluded as number)))
    errors.push("증빙 부인액 및 중복 없는 문화·시장 지출은 연간 총액 범위여야 합니다.");
  return errors;
}
