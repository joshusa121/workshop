import { isWithholdingInput, type WithholdingInput } from "./input";
import { WITHHOLDING_RATES_VERSION } from "./version";

export const WITHHOLDING_SCHEMA_VERSION = 1;
export function encodeWithholding(input: WithholdingInput): string {
  if (!isWithholdingInput(input)) throw new Error("공유할 입력값을 확인해 주세요.");
  return btoa(JSON.stringify({ v: WITHHOLDING_SCHEMA_VERSION, r: WITHHOLDING_RATES_VERSION, d: input }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type WithholdingDecodeResult =
  | { ok: true; input: WithholdingInput; ratesChanged: boolean }
  | { ok: false; reason: "만료된 형식" | "손상된 링크" };
export function decodeWithholding(code: string): WithholdingDecodeResult {
  try {
    const raw: unknown = JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/")));
    if (!raw || typeof raw !== "object") return { ok: false, reason: "손상된 링크" };
    const obj = raw as Record<string, unknown>;
    if (obj.v !== WITHHOLDING_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    if (typeof obj.r !== "string" || !isWithholdingInput(obj.d)) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input: obj.d, ratesChanged: obj.r !== WITHHOLDING_RATES_VERSION };
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
}
