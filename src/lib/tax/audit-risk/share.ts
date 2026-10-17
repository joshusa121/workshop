import { isAuditRiskInput, type AuditRiskInput } from "./input";
import { AUDIT_RISK_RATES_VERSION } from "./version";

export const AUDIT_RISK_SCHEMA_VERSION = 1;
export function encodeAuditRisk(input: AuditRiskInput): string {
  if (!isAuditRiskInput(input)) throw new Error("입력값을 먼저 확인해 주세요.");
  return btoa(JSON.stringify({ v: AUDIT_RISK_SCHEMA_VERSION, r: AUDIT_RISK_RATES_VERSION, d: input })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type AuditRiskDecodeResult = { ok: true; input: AuditRiskInput; ratesChanged: boolean } | { ok: false; reason: "손상된 링크" | "만료된 형식" };
export function decodeAuditRisk(code: string): AuditRiskDecodeResult {
  try {
    if (!code || code.length > 8_000 || !/^[\w-]+$/.test(code)) return { ok: false, reason: "손상된 링크" };
    const obj: unknown = JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/")));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, reason: "손상된 링크" };
    const r = obj as Record<string, unknown>;
    if (r.v !== AUDIT_RISK_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    if (typeof r.r !== "string" || !r.r || !isAuditRiskInput(r.d)) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input: r.d, ratesChanged: r.r !== AUDIT_RISK_RATES_VERSION };
  } catch { return { ok: false, reason: "손상된 링크" }; }
}
