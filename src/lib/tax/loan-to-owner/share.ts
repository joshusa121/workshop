import { isLoanInput, type LoanToOwnerInput } from "./input";
import { LOAN_TO_OWNER_RATES_VERSION } from "./version";
const SCHEMA_VERSION = 1;
function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function encodeLoanToOwner(input: LoanToOwnerInput): string {
  if (!isLoanInput(input)) throw new Error("입력값을 확인해 주세요.");
  return toBase64(JSON.stringify({ v: SCHEMA_VERSION, r: LOAN_TO_OWNER_RATES_VERSION, d: input }));
}
export type LoanDecodeResult = { ok: true; input: LoanToOwnerInput; ratesChanged: boolean } | { ok: false; reason: "만료된 형식" | "손상된 링크" };
export function decodeLoanToOwner(code: string): LoanDecodeResult {
  try {
    if (code.length > 12_000) return { ok: false, reason: "손상된 링크" };
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, reason: "손상된 링크" };
    if (obj.v !== SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    if (typeof obj.r !== "string" || !isLoanInput(obj.d)) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input: obj.d, ratesChanged: obj.r !== LOAN_TO_OWNER_RATES_VERSION };
  } catch { return { ok: false, reason: "손상된 링크" }; }
}
