import { validateInput, type ChecklistInput } from "./input";
import { CHECKLIST_VERSION } from "./version";
export const CHECKLIST_SCHEMA_VERSION = 1;
export function encodeChecklist(input: ChecklistInput): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: CHECKLIST_SCHEMA_VERSION, r: CHECKLIST_VERSION, d: input }));
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type DecodeResult = { ok: true; input: ChecklistInput; ratesChanged: boolean } | { ok: false; reason: "만료된 형식" | "손상된 링크" };
export function decodeChecklist(code: string): DecodeResult {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(code) || code.length > 6000) return { ok: false, reason: "손상된 링크" };
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - code.length % 4) % 4));
    const raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if (!raw || typeof raw !== "object") return { ok: false, reason: "손상된 링크" };
    if (raw.v !== CHECKLIST_SCHEMA_VERSION) return { ok: false, reason: "만료된 형식" };
    if (validateInput(raw.d).length) return { ok: false, reason: "손상된 링크" };
    return { ok: true, input: raw.d, ratesChanged: raw.r !== CHECKLIST_VERSION };
  } catch { return { ok: false, reason: "손상된 링크" }; }
}
