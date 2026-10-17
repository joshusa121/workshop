import { GOODWILL_RATES_VERSION as RATES_VERSION } from "./facts";
import { EMPTY_GOODWILL_INPUT, type GoodwillInput } from "./net-effect";

/** 1화 share-codec과 같은 방식: {v, r, d} → JSON → base64url. 코덱은 독립(스키마 버전 별도) */
const SCHEMA_VERSION = 1;

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

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function num(x: unknown, fallback = 0): number {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}

function parseInput(raw: unknown): GoodwillInput | null {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.netIncomes) || raw.netIncomes.length !== 3) return null;
  const [a, b, c] = raw.netIncomes;
  return {
    ...EMPTY_GOODWILL_INPUT,
    netIncomes: [num(a), num(b), num(c)],
    equity: num(raw.equity),
    otherComprehensiveIncome: num(raw.otherComprehensiveIncome),
    corpTaxBase: num(raw.corpTaxBase),
    withRealEstate: raw.withRealEstate === true,
    discountRate: Math.min(1, Math.max(0, num(raw.discountRate))),
  };
}

export function encodeGoodwill(input: GoodwillInput): string {
  return toBase64Url(JSON.stringify({ v: SCHEMA_VERSION, r: RATES_VERSION, d: input }));
}

export type GoodwillDecodeResult =
  | { ok: true; input: GoodwillInput; ratesChanged: boolean }
  | { ok: false; reason: "만료된 형식" | "손상된 링크" };

export function decodeGoodwill(s: string): GoodwillDecodeResult {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(s));
    if (!isRecord(parsed)) return { ok: false, reason: "손상된 링크" };
    const v = parsed.v;
    if (typeof v !== "number" || v < 0 || v > SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    const input = parseInput(parsed.d);
    if (!input) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input, ratesChanged: parsed.r !== RATES_VERSION };
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
}
