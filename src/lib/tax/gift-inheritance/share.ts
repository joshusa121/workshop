/** 증여 vs 상속 공유 URL 코덱. 1화 share-codec.ts와 같은 버저닝(v·r·d). */
import { GIFT_INHERITANCE_RATES_VERSION as RATES_VERSION } from "./version";
import { normalizeGiftInheritance, type GiftInheritanceInput } from "./input";

export const GIFT_INHERITANCE_SCHEMA_VERSION = 1;

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

export function encodeGiftInheritance(input: GiftInheritanceInput): string {
  return toBase64Url(JSON.stringify({ v: GIFT_INHERITANCE_SCHEMA_VERSION, r: RATES_VERSION, d: input }));
}

export type GiftInheritanceDecodeResult =
  | { ok: true; input: GiftInheritanceInput; ratesChanged: boolean }
  | { ok: false; reason: "만료된 형식" | "손상된 링크" };

export function decodeGiftInheritance(code: string): GiftInheritanceDecodeResult {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(code));
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "손상된 링크" };
  const obj = raw as Record<string, unknown>;
  if (obj.v !== GIFT_INHERITANCE_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
  if (typeof obj.d !== "object" || obj.d === null) return { ok: false, reason: "손상된 링크" };
  return { ok: true, input: normalizeGiftInheritance(obj.d as Partial<GiftInheritanceInput>), ratesChanged: obj.r !== RATES_VERSION };
}
