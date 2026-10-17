/** 금융투자 세금 공유 URL 코덱. 1화 share-codec.ts와 같은 버저닝(v·r·d). */
import { FINANCIAL_RATES_VERSION as RATES_VERSION } from "./version";
import { normalizeFinancial, type FinancialInput } from "./input";

export const FINANCIAL_SCHEMA_VERSION = 1;

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeFinancial(input: FinancialInput): string {
  return toBase64Url(JSON.stringify({ v: FINANCIAL_SCHEMA_VERSION, r: RATES_VERSION, d: input }));
}

export type FinancialDecodeResult =
  | { ok: true; input: FinancialInput; ratesChanged: boolean }
  | { ok: false; reason: "만료된 형식" | "손상된 링크" };

export function decodeFinancial(code: string): FinancialDecodeResult {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(code));
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "손상된 링크" };
  const obj = raw as Record<string, unknown>;
  if (obj.v !== FINANCIAL_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
  if (typeof obj.d !== "object" || obj.d === null) return { ok: false, reason: "손상된 링크" };
  return { ok: true, input: normalizeFinancial(obj.d as Partial<FinancialInput>), ratesChanged: obj.r !== RATES_VERSION };
}
