import { RETIREMENT_RATES_VERSION } from "./version";
import { DEFAULT_RETIREMENT, validateRetirement, type RetirementInput } from "./input";

export const RETIREMENT_SCHEMA_VERSION = 1;
export function encodeRetirement(input: RetirementInput): string {
  return btoa(JSON.stringify({ v: RETIREMENT_SCHEMA_VERSION, r: RETIREMENT_RATES_VERSION, d: input })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type RetirementDecodeResult = { ok: true; input: RetirementInput; ratesChanged: boolean } | { ok: false; reason: "만료된 형식" | "손상된 링크" };
export function decodeRetirement(code: string): RetirementDecodeResult {
  try {
    if (code.length > 8_192 || !/^[A-Za-z0-9_-]+$/.test(code)) return { ok: false, reason: "손상된 링크" };
    const raw = JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - code.length % 4) % 4)));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "손상된 링크" };
    if (raw.v !== RETIREMENT_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    const d = raw.d;
    if (!d || typeof d !== "object" || Array.isArray(d) || typeof d.isExecutive !== "boolean") return { ok: false, reason: "손상된 링크" };
    if (Object.keys(DEFAULT_RETIREMENT).some((key) => !(key in d))) return { ok: false, reason: "손상된 링크" };
    const input: RetirementInput = { amount: d.amount, serviceMonths: d.serviceMonths, isExecutive: d.isExecutive, monthsBefore2012: d.monthsBefore2012, months2012To2019: d.months2012To2019, monthsFrom2020: d.monthsFrom2020, annualSalary2019: d.annualSalary2019, annualSalaryAtRetirement: d.annualSalaryAtRetirement };
    if (validateRetirement(input).length) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input, ratesChanged: raw.r !== RETIREMENT_RATES_VERSION };
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
}
