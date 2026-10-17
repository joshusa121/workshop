/** 주택 양도세 계산기 공유 URL 코덱. 1화 share-codec.ts와 같은 버저닝 방식(v·r·d), 코덱은 별도. */
import { CGT_RATES_VERSION as RATES_VERSION } from "./version";
import type { AssetKind, CgtInput, OtherHolding, SpecialCase } from "./input";
import { isValidDate } from "./period";

export const CGT_SCHEMA_VERSION = 1;

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

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const num = (x: unknown, fallback = 0) => (typeof x === "number" && Number.isFinite(x) ? x : fallback);
const date = (x: unknown, fallback: string) => (typeof x === "string" && isValidDate(x) ? x : fallback);
const kind = (x: unknown): AssetKind => (x === "right" || x === "presale" ? x : "house");

export function encodeCgt(input: CgtInput): string {
  return toBase64Url(JSON.stringify({ v: CGT_SCHEMA_VERSION, r: RATES_VERSION, d: input }));
}

export type CgtDecodeResult =
  | { ok: true; input: CgtInput; ratesChanged: boolean }
  | { ok: false; reason: "만료된 형식" | "손상된 링크" };

function parseOther(raw: unknown): OtherHolding | null {
  if (!isRecord(raw)) return null;
  const acquiredAt = date(raw.acquiredAt, "");
  if (!acquiredAt) return null;
  return {
    kind: kind(raw.kind),
    acquiredAt,
    nonMetroLowValue: raw.nonMetroLowValue === true || undefined,
    inherited: raw.inherited === true || undefined,
  };
}

function parseSpecial(raw: unknown): SpecialCase {
  if (!isRecord(raw)) return { type: "none" };
  if (raw.type === "temporary" || raw.type === "inherited") return { type: raw.type };
  if ((raw.type === "marriage" || raw.type === "cohabitation") && typeof raw.eventDate === "string" && isValidDate(raw.eventDate)) {
    return { type: raw.type, eventDate: raw.eventDate };
  }
  return { type: "none" };
}

function parseInput(raw: unknown): CgtInput | null {
  if (!isRecord(raw) || !isRecord(raw.subject)) return null;
  const s = raw.subject;
  const acquiredAt = date(s.acquiredAt, "");
  const transferredAt = date(s.transferredAt, "");
  if (!acquiredAt || !transferredAt) return null;
  const h = isRecord(raw.household) ? raw.household : {};
  const rd = isRecord(raw.redevelopment) ? raw.redevelopment : null;
  const input: CgtInput = {
    subject: {
      kind: kind(s.kind),
      acquiredAt,
      transferredAt,
      acquisitionPrice: num(s.acquisitionPrice),
      transferPrice: num(s.transferPrice),
      capitalExpenditure: num(s.capitalExpenditure),
      transferCost: num(s.transferCost),
      residenceMonths: Math.max(0, num(s.residenceMonths)),
      adjustedAtAcquisition: s.adjustedAtAcquisition === true,
      adjustedAtTransfer: s.adjustedAtTransfer === true,
      registered: s.registered !== false,
    },
    household: {
      others: Array.isArray(h.others) ? h.others.map(parseOther).filter((o): o is OtherHolding => o !== null) : [],
      special: parseSpecial(h.special),
    },
  };
  if (rd && isRecord(rd.settlement)) {
    const approvalDate = date(rd.approvalDate, "");
    if (approvalDate) {
      input.redevelopment = {
        role: rd.role === "successor" ? "successor" : "original",
        approvalDate,
        appraisal: num(rd.appraisal),
        settlement: { type: rd.settlement.type === "paid" ? "paid" : "received", amount: num(rd.settlement.amount) },
        transferAsNewHouse: rd.transferAsNewHouse === true,
        completionDate: typeof rd.completionDate === "string" && isValidDate(rd.completionDate) ? rd.completionDate : undefined,
      };
    }
  }
  const tr = isRecord(raw.transitional) ? raw.transitional : null;
  if (tr && typeof tr.contractDate === "string" && isValidDate(tr.contractDate)) {
    input.transitional = {
      contractDate: tr.contractDate,
      landPermit: tr.landPermit === true,
      permitAppliedAt: typeof tr.permitAppliedAt === "string" && isValidDate(tr.permitAppliedAt) ? tr.permitAppliedAt : undefined,
      sixMonthRegion: tr.sixMonthRegion === true,
    };
  }
  return input;
}

export function decodeCgt(s: string): CgtDecodeResult {
  let payload: unknown;
  try {
    payload = JSON.parse(fromBase64Url(s));
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
  if (!isRecord(payload)) return { ok: false, reason: "손상된 링크" };
  const v = payload.v;
  if (v !== CGT_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
  const input = parseInput(payload.d);
  if (!input) return { ok: false, reason: "손상된 링크" };
  return { ok: true, input, ratesChanged: payload.r !== RATES_VERSION };
}
