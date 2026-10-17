import { validateInput, type HousingInput } from "./input";
import { HOUSING_RATES_VERSION } from "./version";
export function encodeHousing(input: HousingInput): string {
  if (validateInput(input).length) throw new Error("입력값을 확인하세요.");
  return btoa(JSON.stringify({ v: 1, r: HOUSING_RATES_VERSION, d: input })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export type HousingDecode = { ok: true; input: HousingInput; ratesChanged: boolean } | { ok: false; reason: string };
export function decodeHousing(s: string): HousingDecode {
  try {
    if (s.length > 12000) return { ok: false, reason: "너무 긴 링크입니다." };
    const raw = JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));
    if (!raw || raw.v !== 1 || typeof raw.r !== "string" || validateInput(raw.d).length) return { ok: false, reason: "입력 링크가 손상되었거나 지원하지 않는 형식입니다." };
    const { purchasePrice, acquisitionHomes, regulated, temporaryTwo, ruralExempt, householdSingle, age, holdingYears } = raw.d;
    const homes = raw.d.homes.map(({ publicValue, urban }: HousingInput["homes"][number]) => ({ publicValue, urban }));
    return { ok: true, input: { purchasePrice, acquisitionHomes, regulated, temporaryTwo, ruralExempt, homes, householdSingle, age, holdingYears }, ratesChanged: raw.r !== HOUSING_RATES_VERSION };
  } catch { return { ok: false, reason: "입력 링크를 복원하지 못했습니다." }; }
}
