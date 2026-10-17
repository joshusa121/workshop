/** 자금출처 진단 공유 URL 코덱. 1화 share-codec.ts와 같은 버저닝(v·r·d). */
import { FUNDS_SOURCE_RATES_VERSION as RATES_VERSION } from "./version";
import { normalizeFundsSource, type FundsSourceInput } from "./input";

export const FUNDS_SOURCE_SCHEMA_VERSION = 1;

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

export function encodeFundsSource(input: FundsSourceInput): string {
  return toBase64Url(JSON.stringify({ v: FUNDS_SOURCE_SCHEMA_VERSION, r: RATES_VERSION, d: input }));
}

export type FundsSourceDecodeResult =
  | { ok: true; input: FundsSourceInput; ratesChanged: boolean }
  | { ok: false; reason: "만료된 형식" | "손상된 링크" };

export function decodeFundsSource(code: string): FundsSourceDecodeResult {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(code));
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "손상된 링크" };
  const obj = raw as Record<string, unknown>;
  if (obj.v !== FUNDS_SOURCE_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
  if (typeof obj.d !== "object" || obj.d === null) return { ok: false, reason: "손상된 링크" };
  return { ok: true, input: normalizeFundsSource(obj.d as Partial<FundsSourceInput>), ratesChanged: obj.r !== RATES_VERSION };
}
