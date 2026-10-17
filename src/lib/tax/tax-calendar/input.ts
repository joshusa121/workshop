import { CALENDAR_YEAR } from "./version";

export type CalendarInput = {
  year: number;
  entity: "individual" | "corporation";
  vat: "general" | "simplified" | "exempt";
  /** 대상 여부를 별도로 확인한 뒤 실제로 성실신고확인서를 제출하는 경우 */
  sincere: boolean;
  fiscalEndMonth: number;
  /** semiannual은 승인·지정 및 적용 가능한 징수분임을 사용자가 확인한 전제 */
  withholding: "none" | "monthly" | "semiannual";
  payroll: boolean;
  house: boolean;
  land: boolean;
  building: boolean;
  comprehensiveProperty: boolean;
};

export const DEFAULT_INPUT: CalendarInput = {
  year: CALENDAR_YEAR, entity: "individual", vat: "general", sincere: false,
  fiscalEndMonth: 12, withholding: "none", payroll: false,
  house: false, land: false, building: false, comprehensiveProperty: false,
};

/** 공유 URL도 사용자 입력으로 취급한다. 누락·잘못된 타입을 기본값으로 조용히 바꾸지 않는다. */
export function parseInput(raw: unknown): CalendarInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.year !== CALENDAR_YEAR || typeof r.entity !== "string" || typeof r.vat !== "string" || typeof r.withholding !== "string" || !["individual", "corporation"].includes(String(r.entity)) ||
      !["general", "simplified", "exempt"].includes(String(r.vat)) ||
      !["none", "monthly", "semiannual"].includes(String(r.withholding)) ||
      typeof r.fiscalEndMonth !== "number" || !Number.isInteger(r.fiscalEndMonth) || r.fiscalEndMonth < 1 || r.fiscalEndMonth > 12 ||
      (r.entity === "corporation" && r.vat === "simplified")) return null;
  for (const k of ["sincere", "payroll", "house", "land", "building", "comprehensiveProperty"]) {
    if (typeof r[k] !== "boolean") return null;
  }
  return {
    year: r.year, entity: r.entity as CalendarInput["entity"], vat: r.vat as CalendarInput["vat"],
    withholding: r.withholding as CalendarInput["withholding"], fiscalEndMonth: r.fiscalEndMonth,
    sincere: r.sincere as boolean, payroll: r.payroll as boolean, house: r.house as boolean,
    land: r.land as boolean, building: r.building as boolean, comprehensiveProperty: r.comprehensiveProperty as boolean,
  };
}
