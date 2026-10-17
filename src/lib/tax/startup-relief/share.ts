import { inputErrors, normalizeStartupRelief, type StartupReliefInput } from "./input";
import { STARTUP_RELIEF_RATES_VERSION } from "./version";
export const STARTUP_RELIEF_SCHEMA_VERSION = 1;
export function encodeStartupRelief(input: StartupReliefInput): string {
  return btoa(JSON.stringify({ v: STARTUP_RELIEF_SCHEMA_VERSION, r: STARTUP_RELIEF_RATES_VERSION, d: input }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type StartupDecodeResult = { ok: true; input: StartupReliefInput; ratesChanged: boolean } | { ok: false; reason: "만료된 형식" | "손상된 링크" };
export function decodeStartupRelief(code: string): StartupDecodeResult {
  try {
    if (code.length > 12_000) return { ok: false, reason: "손상된 링크" };
    const raw = JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "손상된 링크" };
    if (raw.v !== STARTUP_RELIEF_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    if (!raw.d || typeof raw.d !== "object" || Array.isArray(raw.d)) return { ok: false, reason: "손상된 링크" };
    const d = raw.d as StartupReliefInput;
    const keys: (keyof StartupReliefInput)[] = ["startupDate", "taxYear", "firstIncomeYear", "region", "youth", "sme", "industry", "startupKind", "specialCase", "annualRevenue", "eligibleTax"];
    if (keys.some(k => !Object.hasOwn(d, k)) || inputErrors(d).length) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input: normalizeStartupRelief(d), ratesChanged: raw.r !== STARTUP_RELIEF_RATES_VERSION };
  } catch { return { ok: false, reason: "손상된 링크" }; }
}
