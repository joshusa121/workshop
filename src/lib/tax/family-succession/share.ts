import { inputErrors, type FamilySuccessionInput } from "./input";
import { FAMILY_SUCCESSION_RATES_VERSION } from "./version";
export const FAMILY_SUCCESSION_SCHEMA_VERSION = 1;
export function encodeFamilySuccession(input: FamilySuccessionInput): string {
  return btoa(JSON.stringify({ v: FAMILY_SUCCESSION_SCHEMA_VERSION, r: FAMILY_SUCCESSION_RATES_VERSION, d: input }))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export type FamilyDecodeResult = { ok: true; input: FamilySuccessionInput; ratesChanged: boolean } | { ok: false; reason: "손상된 링크" | "만료된 형식" };
export function decodeFamilySuccession(code: string): FamilyDecodeResult {
  try {
    if (code.length > 12_000) return { ok: false, reason: "손상된 링크" };
    const raw = JSON.parse(atob(code.replaceAll("-", "+").replaceAll("_", "/")));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "손상된 링크" };
    if (raw.v !== FAMILY_SUCCESSION_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    if (!raw.d || typeof raw.d !== "object" || Array.isArray(raw.d) || inputErrors(raw.d).length) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input: raw.d, ratesChanged: raw.r !== FAMILY_SUCCESSION_RATES_VERSION };
  } catch { return { ok: false, reason: "손상된 링크" }; }
}
