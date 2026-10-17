import { validateInput, type RentalInput } from "./input";
import { RENTAL_RATES_VERSION } from "./version";
export function encodeRental(input: RentalInput): string {
  if (validateInput(input).length) throw new Error("입력값을 확인하세요.");
  return btoa(JSON.stringify({ v: 1, r: RENTAL_RATES_VERSION, d: input })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type RentalDecode = { ok: true; input: RentalInput; ratesChanged: boolean } | { ok: false; reason: string };
export function decodeRental(s: string): RentalDecode {
  try {
    if (s.length > 4000) return { ok: false, reason: "손상된 링크" };
    const raw = JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));
    if (!raw || typeof raw !== "object") return { ok: false, reason: "손상된 링크" };
    if (raw.v !== 1) return { ok: false, reason: "만료된 형식" };
    if (validateInput(raw.d).length) return { ok: false, reason: "손상된 링크" };
    const { revenue, expenses, otherIncome, otherFinancial, kind, registered, smallCorp, dividendPercent } = raw.d;
    return { ok: true, input: { revenue, expenses, otherIncome, otherFinancial, kind, registered, smallCorp, dividendPercent }, ratesChanged: raw.r !== RENTAL_RATES_VERSION };
  } catch { return { ok: false, reason: "손상된 링크" }; }
}
