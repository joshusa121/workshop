import { DEFAULT_INPUT, validateInput, type ExpenseInput } from "./input";
import { EXPENSE_SCHEMA_VERSION, EXPENSE_VERSION } from "./version";

export function encodeExpense(input: ExpenseInput): string {
  const errors = validateInput(input);
  if (errors.length) throw new Error(errors.join(" "));
  const bytes = new TextEncoder().encode(JSON.stringify({ v: EXPENSE_SCHEMA_VERSION, r: EXPENSE_VERSION, d: input }));
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type ExpenseDecode = { ok: true; input: ExpenseInput; ratesChanged: boolean } | { ok: false; reason: string };
export function decodeExpense(s: string): ExpenseDecode {
  try {
    if (s.length > 12_000 || !/^[A-Za-z0-9_-]+$/.test(s)) return { ok: false, reason: "손상된 링크" };
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4));
    const p = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if (!p || typeof p !== "object") return { ok: false, reason: "손상된 링크" };
    if (p.v !== EXPENSE_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    if (validateInput(p.d).length) return { ok: false, reason: "손상된 링크" };
    // 입력 스키마 밖의 값은 공유 링크로 전파하지 않는다.
    const input = Object.fromEntries(Object.keys(DEFAULT_INPUT).map(k => [k, p.d[k]])) as ExpenseInput;
    return { ok: true, input, ratesChanged: p.r !== EXPENSE_VERSION };
  } catch { return { ok: false, reason: "손상된 링크" }; }
}
