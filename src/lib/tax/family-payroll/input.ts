export type Check = "unknown" | "yes" | "no";
export type FamilyPayrollInput = {
  relation: "spouse" | "child"; livingTogether: boolean;
  actualWork: Check; reasonablePay: Check; evidence: Check;
  businessTaxBase: number; salary: number; employerPremium: number;
  workerPension: number; workerOtherPremium: number;
  insuranceConfirmed: boolean; onlySalary: boolean; wasDependent: boolean;
};
export const DEFAULT_FAMILY_INPUT: FamilyPayrollInput = {
  relation: "spouse", livingTogether: true,
  actualWork: "unknown", reasonablePay: "unknown", evidence: "unknown",
  businessTaxBase: 0, salary: 0, employerPremium: 0, workerPension: 0, workerOtherPremium: 0,
  insuranceConfirmed: false, onlySalary: false, wasDependent: false,
};
export const SAMPLE_FAMILY_INPUT: FamilyPayrollInput = {
  ...DEFAULT_FAMILY_INPUT, actualWork: "yes", reasonablePay: "yes", evidence: "yes",
  businessTaxBase: 150_000_000, salary: 45_000_000, employerPremium: 4_500_000,
  workerPension: 2_137_500, workerOtherPremium: 2_000_000, insuranceConfirmed: true, onlySalary: true,
};
export function familyInputErrors(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["입력 형식을 확인해 주세요."];
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const [key, label] of [["businessTaxBase", "고용 전 과세표준"], ["salary", "연간 총급여"], ["employerPremium", "사업주 보험 증가액"], ["workerPension", "직원 국민연금"], ["workerOtherPremium", "직원 건강·장기요양·고용보험"]]) {
    if (typeof r[key] !== "number" || !Number.isSafeInteger(r[key]) || (r[key] as number) < 0 || (r[key] as number) > 1_000_000_000_000) errors.push(`${label}은 음수가 아닌 정수 원으로 입력해 주세요(최대 1조원).`);
  }
  for (const key of ["actualWork", "reasonablePay", "evidence"]) if (!["unknown", "yes", "no"].includes(r[key] as string)) errors.push("근무·급여·증빙 확인 항목을 선택해 주세요.");
  for (const key of ["livingTogether", "insuranceConfirmed", "onlySalary", "wasDependent"]) if (typeof r[key] !== "boolean") errors.push("가족·보험·다른 소득 확인 항목이 누락되었습니다.");
  if (r.relation !== "spouse" && r.relation !== "child") errors.push("배우자 또는 자녀를 선택해 주세요.");
  if (typeof r.salary === "number" && typeof r.workerPension === "number" && typeof r.workerOtherPremium === "number" && r.workerPension + r.workerOtherPremium > r.salary) errors.push("직원 부담 보험료 합계가 총급여보다 큽니다. 연간 금액과 부담 주체를 확인해 주세요.");
  if (r.salary === 0 && typeof r.employerPremium === "number" && r.employerPremium > 0) errors.push("급여가 없는데 사업주 보험 증가액이 있습니다. 고용으로 늘어난 금액만 입력해 주세요.");
  return errors;
}
export function isFamilyInput(raw: unknown): raw is FamilyPayrollInput { return familyInputErrors(raw).length === 0; }
