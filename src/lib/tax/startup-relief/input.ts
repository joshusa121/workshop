export const REGIONS = {
  outside: "수도권 밖", depopulation: "수도권의 인구감소지역",
  capital: "수도권 중 과밀·인구감소지역 외", overcrowded: "수도권과밀억제권역",
  unknown: "지역 구분 미확인",
} as const;
export const INDUSTRIES = {
  manufacturing: "제조업", restaurant: "음식점업", online: "통신판매업",
  software: "소프트웨어 개발·공급업",
  verified: "그 밖의 법 제6조 제3항 대상 업종 (별도 확인)",
  excluded: "감면 대상이 아닌 업종 (세무·법률·부동산 임대 등)",
  unknown: "업종 구분 미확인",
} as const;
export const STARTUP_KINDS = {
  new: "새 사업을 처음 시작", conversion: "하던 사업을 법인으로 전환",
  restart: "폐업 후 같은 종류의 사업 재개", expansion: "기존 사업 확장·업종 추가",
  succession: "사업 승계·종전 자산 인수 (예외 검토 필요)", unknown: "창업 유형 미확인",
} as const;
export type Confirmation = "yes" | "no" | "unknown";
export type StartupReliefInput = {
  startupDate: string;
  taxYear: number;
  firstIncomeYear: number | null;
  region: keyof typeof REGIONS;
  youth: Confirmation;
  sme: Confirmation;
  industry: keyof typeof INDUSTRIES;
  startupKind: keyof typeof STARTUP_KINDS;
  specialCase: boolean;
  /** 과세기간이 1년 미만이면 연간으로 환산한 수입금액 */
  annualRevenue: number;
  /** 해당 감면 대상 사업에서 생긴 소득에 대한 소득세 또는 법인세 산출세액 */
  eligibleTax: number;
};
export const DEFAULT_STARTUP_RELIEF: StartupReliefInput = {
  startupDate: "", taxYear: 2026, firstIncomeYear: null,
  region: "unknown", youth: "unknown", sme: "unknown", industry: "unknown", startupKind: "unknown",
  specialCase: false, annualRevenue: 0, eligibleTax: 0,
};
export const SAMPLE_STARTUP_RELIEF: StartupReliefInput = {
  startupDate: "2026-01-01", taxYear: 2026, firstIncomeYear: 2026,
  region: "capital", youth: "yes", sme: "yes", industry: "software", startupKind: "new",
  specialCase: false, annualRevenue: 200_000_000, eligibleTax: 10_000_000,
};
const confirmation = (v: unknown): Confirmation => v === "yes" || v === "no" ? v : "unknown";
export function normalizeStartupRelief(p: Partial<StartupReliefInput>): StartupReliefInput {
  const d = { ...DEFAULT_STARTUP_RELIEF, ...p };
  return {
    startupDate: typeof d.startupDate === "string" ? d.startupDate : "",
    taxYear: d.taxYear, firstIncomeYear: d.firstIncomeYear,
    region: Object.hasOwn(REGIONS, d.region) ? d.region : "unknown",
    industry: Object.hasOwn(INDUSTRIES, d.industry) ? d.industry : "unknown",
    startupKind: Object.hasOwn(STARTUP_KINDS, d.startupKind) ? d.startupKind : "unknown",
    youth: confirmation(d.youth), sme: confirmation(d.sme),
    specialCase: d.specialCase === true, annualRevenue: d.annualRevenue, eligibleTax: d.eligibleTax,
  };
}
export function inputErrors(i: StartupReliefInput): string[] {
  const errors: string[] = [];
  const date = new Date(`${i.startupDate}T00:00:00Z`);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(i.startupDate) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === i.startupDate;
  if (!validDate) errors.push("실제 창업일을 입력해 주세요.");
  if (!Number.isInteger(i.taxYear) || i.taxYear < 2026 || i.taxYear > 9999) errors.push("계산 연도는 2026년 이후의 정수로 입력해 주세요.");
  const startYear = validDate ? date.getUTCFullYear() : 0;
  if (validDate && startYear > i.taxYear) errors.push("계산 연도가 창업 연도보다 빠릅니다.");
  if (i.firstIncomeYear !== null && (!Number.isInteger(i.firstIncomeYear) || i.firstIncomeYear < startYear || i.firstIncomeYear > i.taxYear)) errors.push("최초 소득 연도는 창업 연도부터 계산 연도 사이여야 합니다.");
  if (i.firstIncomeYear === null && i.eligibleTax > 0) errors.push("소득이 아직 없다는 응답과 양수의 산출세액이 서로 맞지 않습니다.");
  for (const [label, n] of [["수입금액", i.annualRevenue], ["산출세액", i.eligibleTax]] as const) {
    if (!Number.isSafeInteger(n) || n < 0) errors.push(`${label}은 0 이상의 안전한 정수 원 단위로 입력해 주세요.`);
  }
  if (!Object.hasOwn(REGIONS, i.region) || !Object.hasOwn(INDUSTRIES, i.industry) || !Object.hasOwn(STARTUP_KINDS, i.startupKind) || !["yes", "no", "unknown"].includes(i.youth) || !["yes", "no", "unknown"].includes(i.sme) || typeof i.specialCase !== "boolean") errors.push("요건 선택값을 다시 확인해 주세요.");
  return errors;
}
