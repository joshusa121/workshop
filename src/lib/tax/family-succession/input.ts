export type Confirmation = "yes" | "no" | "unknown";
export type FamilySuccessionInput = {
  mode: "inheritance" | "gift";
  legalForm: "corporation" | "individual";
  companySize: "sme" | "mid";
  enterprise: Confirmation;
  resident: Confirmation;
  largestShareholder: Confirmation;
  compliance: Confirmation;
  appointment: Confirmation;
  successorContinuous: Confirmation;
  exceptionalDeath: Confirmation;
  businessYears: number;
  ownerAge: number;
  recipientAge: number;
  familySharePercent: number;
  shareHoldingYears: number;
  listed: boolean;
  ownerRepresentativeYears: number;
  ownerRepresentativeLastTen: number;
  recipientWorkYears: number;
  /** 사업무관자산 등을 제외한 금액. 평가는 사용자가 별도 확인. */
  eligibleValue: number;
  averageRevenue: number;
  otherEstate: number;
  inheritanceTaxWithoutRelief: number;
};
export const DEFAULT_FAMILY_SUCCESSION: FamilySuccessionInput = {
  mode: "inheritance", legalForm: "corporation", companySize: "sme",
  enterprise: "unknown", resident: "unknown", largestShareholder: "unknown", compliance: "unknown", appointment: "unknown", successorContinuous: "unknown", exceptionalDeath: "unknown",
  businessYears: 0, ownerAge: 0, recipientAge: 0, familySharePercent: 0, shareHoldingYears: 0, listed: false,
  ownerRepresentativeYears: 0, ownerRepresentativeLastTen: 0, recipientWorkYears: 0,
  eligibleValue: 0, averageRevenue: 0, otherEstate: 0, inheritanceTaxWithoutRelief: 0,
};
export const SAMPLE_FAMILY_SUCCESSION: FamilySuccessionInput = {
  ...DEFAULT_FAMILY_SUCCESSION, enterprise: "yes", resident: "yes", largestShareholder: "yes", compliance: "yes", appointment: "yes", successorContinuous: "no", exceptionalDeath: "no",
  businessYears: 20, ownerAge: 70, recipientAge: 40, familySharePercent: 60, shareHoldingYears: 20,
  ownerRepresentativeYears: 20, ownerRepresentativeLastTen: 10, recipientWorkYears: 2, eligibleValue: 30_000_000_000,
};
export const CONFIRMATION_KEYS = ["enterprise", "resident", "largestShareholder", "compliance", "appointment", "successorContinuous", "exceptionalDeath"] as const;
export const NUMBER_KEYS = ["businessYears", "ownerAge", "recipientAge", "familySharePercent", "shareHoldingYears", "ownerRepresentativeYears", "ownerRepresentativeLastTen", "recipientWorkYears", "eligibleValue", "averageRevenue", "otherEstate", "inheritanceTaxWithoutRelief"] as const;
export function inputErrors(i: FamilySuccessionInput): string[] {
  const errors: string[] = [];
  if (!i || typeof i !== "object") return ["입력값이 올바르지 않습니다."];
  if (!["inheritance", "gift"].includes(i.mode) || !["corporation", "individual"].includes(i.legalForm) || !["sme", "mid"].includes(i.companySize) || typeof i.listed !== "boolean" || CONFIRMATION_KEYS.some(k => !["yes", "no", "unknown"].includes(i[k]))) errors.push("요건 선택값을 확인해 주세요.");
  if (NUMBER_KEYS.some(k => typeof i[k] !== "number" || !Number.isFinite(i[k]) || i[k] < 0)) errors.push("금액·나이·기간·지분은 유한한 0 이상의 숫자여야 합니다.");
  if ([i.eligibleValue, i.averageRevenue, i.otherEstate, i.inheritanceTaxWithoutRelief].some(n => !Number.isSafeInteger(n))) errors.push("금액은 안전한 정수 원 단위로 입력해 주세요.");
  if (i.familySharePercent > 100) errors.push("지분은 100%를 넘을 수 없습니다.");
  if (i.ownerRepresentativeYears > i.businessYears || i.ownerRepresentativeLastTen > Math.min(10, i.businessYears, i.ownerRepresentativeYears)) errors.push("대표 재직기간은 경영기간을 넘을 수 없고, 최근 대표 재직기간은 최근 10년과 전체 대표 재직기간 이내여야 합니다.");
  if (i.recipientWorkYears > i.businessYears || i.shareHoldingYears > i.businessYears) errors.push("종사·지분 보유기간은 경영기간 이내여야 합니다.");
  return errors;
}
