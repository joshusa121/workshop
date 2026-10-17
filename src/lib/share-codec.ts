import { DEFAULT_FAMILY_SALARY, EMPTY_SCENARIO } from "./default-scenario";
import { DEFAULT_ASSUMPTIONS, resolveAssumptions, type Assumptions } from "./tax/assumptions";
import { floorWon } from "./tax/rounding";
import { corpDistributableCash } from "./tax/scenario";
import type { ScenarioInput } from "./tax/scenario-input";
import { RATES_VERSION } from "./tax/sources";

/**
 * v1 → v2 (2026-09-26): dividendPayoutRatio → dividendAmount(연 배당액),
 * familyWorkers/familySalaryEach, retirementMultiple, plansRealEstatePurchase/nonTaxReasons 추가.
 * v1 이하 payload는 자본금이 비어 있으면 그대로 비워 둔다(순자산 대용 의미 유지).
 */
/** v2 → v3 (2026-09-26 트랙 D): yellowUmbrellaEnabled/Contribution, startupReliefRate/YearsLeft 추가. 구버전은 노란우산 ON(자동 납입)·창업감면 OFF */
const SCHEMA_VERSION = 3;

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

/** 전제 덮어쓰기: Assumptions 키만, 유한한 0 이상 숫자만 받는다. 남는 게 없으면 undefined */
function parseOverrides(raw: unknown): Partial<Assumptions> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Partial<Assumptions> = {};
  for (const key of Object.keys(DEFAULT_ASSUMPTIONS) as (keyof Assumptions)[]) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseInput(raw: unknown, version: number): ScenarioInput | null {
  if (!isRecord(raw)) return null;
  const legacy = version < 2;
  const assets = isRecord(raw.assets) ? raw.assets : {};
  const workplace = isRecord(raw.workplace) ? raw.workplace : {};
  const personal = isRecord(raw.personalContext) ? raw.personalContext : {};
  const industry = raw.industryGroup;
  if (
    industry !== "농림어업광업도소매" &&
    industry !== "제조건설음식숙박" &&
    industry !== "서비스임대"
  ) {
    return null;
  }
  return {
    ...EMPTY_SCENARIO,
    revenue: num(raw.revenue),
    accountingProfit: num(raw.accountingProfit),
    taxAdjustment: num(raw.taxAdjustment),
    industryGroup: industry,
    workplace: {
      sido: typeof workplace.sido === "string" ? workplace.sido : EMPTY_SCENARIO.workplace.sido,
      sigungu: typeof workplace.sigungu === "string" ? workplace.sigungu : undefined,
    },
    revenueHistory: Array.isArray(raw.revenueHistory)
      ? raw.revenueHistory
          .filter(isRecord)
          .map((h) => ({ year: num(h.year), revenue: num(h.revenue) }))
          .filter((h) => h.year > 0)
      : undefined,
    assets: {
      total: num(assets.total),
      realEstate: num(assets.realEstate),
      housing: num(assets.housing),
    },
    liabilities: num(raw.liabilities),
    capital: typeof raw.capital === "number" && Number.isFinite(raw.capital) && raw.capital > 0 ? raw.capital : undefined,
    ownerSalary: num(raw.ownerSalary),
    dividendAmount: Math.max(0, num(raw.dividendAmount, legacy ? 0 : EMPTY_SCENARIO.dividendAmount)),
    retirementPlan: raw.retirementPlan === true,
    retirementMultiple: raw.retirementMultiple === 1 || raw.retirementMultiple === 3 ? raw.retirementMultiple : 2,
    familyWorkers: Math.min(2, Math.max(0, Math.floor(num(raw.familyWorkers)))),
    familySalaryEach: Math.max(0, num(raw.familySalaryEach, DEFAULT_FAMILY_SALARY)),
    familyLivesSeparately: raw.familyLivesSeparately === true,
    plansRealEstatePurchase: raw.plansRealEstatePurchase === true,
    nonTaxReasons: raw.nonTaxReasons === true,
    yellowUmbrellaEnabled: raw.yellowUmbrellaEnabled !== false,
    yellowUmbrellaContribution:
      typeof raw.yellowUmbrellaContribution === "number" && Number.isFinite(raw.yellowUmbrellaContribution) && raw.yellowUmbrellaContribution >= 0
        ? raw.yellowUmbrellaContribution
        : undefined,
    startupReliefRate: raw.startupReliefRate === 0.5 || raw.startupReliefRate === 1 ? raw.startupReliefRate : 0,
    startupReliefYearsLeft: Math.min(5, Math.max(1, Math.floor(num(raw.startupReliefYearsLeft, 3)) || 3)),
    bookkeepingType: raw.bookkeepingType === "간편장부" ? "간편장부" : "복식부기",
    sincereFilingConfirmCost: num(raw.sincereFilingConfirmCost),
    voluntaryEmploymentIns: raw.voluntaryEmploymentIns === true,
    voluntaryWorkersComp: raw.voluntaryWorkersComp === true,
    personalContext: {
      otherIncome: num(personal.otherIncome),
      propertyForHealthIns:
        typeof personal.propertyForHealthIns === "number"
          ? personal.propertyForHealthIns
          : undefined,
    },
    overrides: parseOverrides(raw.overrides),
  };
}

export function encodeScenario(input: ScenarioInput): string {
  const payload = { v: SCHEMA_VERSION, r: RATES_VERSION, d: input };
  return toBase64Url(JSON.stringify(payload));
}

export type DecodeResult =
  | { ok: true; input: ScenarioInput; ratesChanged: boolean }
  | { ok: false; reason: "만료된 형식" | "손상된 링크" };

export function decodeScenario(s: string): DecodeResult {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(s));
    if (!isRecord(parsed)) return { ok: false, reason: "손상된 링크" };
    const v = parsed.v;
    if (typeof v !== "number" || v < 0 || v > SCHEMA_VERSION) {
      return { ok: false, reason: "만료된 형식" };
    }
    const input = parseInput(parsed.d, v);
    if (!input) return { ok: false, reason: "손상된 링크" };
    if (v < 2 && isRecord(parsed.d) && typeof parsed.d.dividendPayoutRatio === "number") {
      const ratio = Math.min(1, Math.max(0, parsed.d.dividendPayoutRatio));
      const cash = Math.max(0, corpDistributableCash(input, resolveAssumptions(input.overrides)));
      input.dividendAmount = floorWon(cash * ratio);
    }
    return {
      ok: true,
      input,
      ratesChanged: parsed.r !== RATES_VERSION,
    };
  } catch {
    return { ok: false, reason: "손상된 링크" };
  }
}
