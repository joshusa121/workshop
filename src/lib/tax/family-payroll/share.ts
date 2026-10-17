import { isFamilyInput, type FamilyPayrollInput } from "./input";
import { FAMILY_PAYROLL_VERSION } from "./version";
export function encodeFamilyPayroll(input: FamilyPayrollInput): string {
  if (!isFamilyInput(input)) throw new Error("입력값을 확인해 주세요.");
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, r: FAMILY_PAYROLL_VERSION, d: input }));
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type FamilyDecode = { ok: true; input: FamilyPayrollInput; ratesChanged: boolean } | { ok: false; reason: "만료된 형식" | "손상된 링크" };
export function decodeFamilyPayroll(code: string): FamilyDecode {
  try {
    if (!code || code.length > 12_000 || !/^[A-Za-z0-9_-]+={0,2}$/.test(code)) return { ok: false, reason: "손상된 링크" };
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, reason: "손상된 링크" };
    if (obj.v !== 1) return { ok: false, reason: "만료된 형식" };
    if (typeof obj.r !== "string" || !isFamilyInput(obj.d)) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input: obj.d, ratesChanged: obj.r !== FAMILY_PAYROLL_VERSION };
  } catch { return { ok: false, reason: "손상된 링크" }; }
}
