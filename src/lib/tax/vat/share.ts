/** 부가가치세 계산기 공유 URL 코덱. 1화 share-codec.ts와 같은 버저닝(v·r·d). */
import { VAT_RATES_VERSION as RATES_VERSION } from "./version";
import { normalizeVat, type VatInput } from "./input";

export const VAT_SCHEMA_VERSION = 1;

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

export function encodeVat(input: VatInput): string {
  return toBase64Url(JSON.stringify({ v: VAT_SCHEMA_VERSION, r: RATES_VERSION, d: input }));
}

export type VatDecodeResult =
  | { ok: true; input: VatInput; ratesChanged: boolean }
  | { ok: false; reason: "만료된 형식" | "손상된 링크" };

export function decodeVat(code: string): VatDecodeResult {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(code));
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "손상된 링크" };
  const obj = raw as Record<string, unknown>;
  if (obj.v !== VAT_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
  if (typeof obj.d !== "object" || obj.d === null) return { ok: false, reason: "손상된 링크" };
  return { ok: true, input: normalizeVat(obj.d as Partial<VatInput>), ratesChanged: obj.r !== RATES_VERSION };
}
