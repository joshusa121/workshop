import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../src/lib/catalog";
import * as corpRates from "../src/lib/tax/rates";
import * as goodwillFacts from "../src/lib/tax/goodwill/facts";
import * as cgtRates from "../src/lib/tax/cgt/rates-cgt";
import * as compRates from "../src/lib/tax/comp-income/rates-comp";
import * as vatRates from "../src/lib/tax/vat/rates-vat";
import * as fundsRates from "../src/lib/tax/funds-source/rates-fs";
import * as giftRates from "../src/lib/tax/gift-inheritance/rates-gi";
import * as finRates from "../src/lib/tax/financial/rates-fin";
import * as retireRates from "../src/lib/tax/retirement/rates-retirement";
import * as rentalRates from "../src/lib/tax/rental-entity/rates-2026";
import * as loanRates from "../src/lib/tax/loan-to-owner/rates-2026";
import * as startupRates from "../src/lib/tax/startup-relief/rates-startup";
import * as sincereRates from "../src/lib/tax/sincere-filing/rates-sincere";
import * as housingRates from "../src/lib/tax/housing-tax/rates";
import * as successionRates from "../src/lib/tax/family-succession/rates";
import * as auditRates from "../src/lib/tax/audit-risk/rates";
import * as expenseRates from "../src/lib/tax/expense-check/rates";
import * as payrollRates from "../src/lib/tax/family-payroll/rates";
import * as calendarRates from "../src/lib/tax/tax-calendar/rates";
import * as checklistRates from "../src/lib/tax/filing-checklist/rates";
import * as withholdingRates from "../src/lib/tax/withholding/rates";

/**
 * 제품별 세율 버전 가드 (Josh 2026-09-26: 제품마다 세율 버전 분리. 2026-11-02: 1~3화만 → 21편 전체로 확대).
 *
 * 제품이 쓰는 법령 값(자기 rates 모듈 + 1화와 공유하는 값)의 지문을 catalog.ts의 ratesVersion과 함께 고정한다.
 * 값이 바뀌었는데 이 테스트가 실패하면: 해당 제품의 세율 버전(catalog의 ratesVersion이 가리키는 상수)을 올리고
 * 아래 EXPECTED의 version·fingerprint를 함께 갱신한다. 버전을 올리면 예전 공유 링크에 "결과가 달라질 수 있음" 안내가 뜬다.
 *
 * 지문에 넣는 것: RateEntry의 value, 근거(Basis)가 아닌 상수 객체·배열·숫자·문자열.
 * 빼는 것: 근거 메타(조문·확인일 — 값이 아님)와 함수. 법령 값을 만드는 함수는 deps에 호출 결과를 직접 넣는다.
 * 한계: 엔진(engine.ts) 안에 숫자를 직접 적은 값은 잡지 못한다. 법령 값은 rates 모듈에 둔다.
 */
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function isBasis(x: unknown): boolean {
  return typeof x === "object" && x !== null && !Array.isArray(x) && "kind" in x && ((x as { kind: unknown }).kind === "law" || (x as { kind: unknown }).kind === "assumption");
}

function strip(x: unknown): Json | undefined {
  if (typeof x === "function" || x === undefined || isBasis(x)) return undefined;
  if (x === null || typeof x !== "object") return x as Json;
  if (Array.isArray(x)) return x.map((v) => strip(v) ?? null);
  const o = x as Record<string, unknown>;
  if ("value" in o && "basis" in o) return strip(o.value) ?? null;
  const out: Record<string, Json> = {};
  for (const k of Object.keys(o).sort()) {
    if (k === "basis" || k === "confirmedAt") continue;
    const v = strip(o[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function fingerprint(deps: Record<string, unknown>): string {
  const entries = Object.keys(deps)
    .sort()
    .filter((k) => !/VERSION$/.test(k)) // 버전 문자열 자체는 값이 아님
    .map((k) => [k, strip(deps[k])] as const)
    .filter(([, v]) => v !== undefined);
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex").slice(0, 16);
}

const { INCOME_TAX_BRACKETS, CORP_TAX_BRACKETS, LOCAL_TAX_RATE, BASIC_DEDUCTION_SELF } = corpRates;

/** 제품 slug → 그 제품이 쓰는 법령 값. 1화와 공유하는 값은 이름으로 골라 넣는다(1화 전용 값이 바뀌어도 다른 제품 지문은 그대로). */
const DEPS: Record<string, Record<string, unknown>> = {
  "corp-conversion": { ...corpRates },
  goodwill: { ...goodwillFacts, INCOME_TAX_BRACKETS, CORP_TAX_BRACKETS, LOCAL_TAX_RATE, BASIC_DEDUCTION_SELF },
  "capital-gains": { ...cgtRates, INCOME_TAX_BRACKETS, LOCAL_TAX_RATE },
  "comprehensive-income": {
    ...compRates,
    INCOME_TAX_BRACKETS,
    LOCAL_TAX_RATE,
    SINCERE_CONFIRM_CREDIT_RATE: corpRates.SINCERE_CONFIRM_CREDIT_RATE,
    SINCERE_CONFIRM_CAP_INDIV: corpRates.SINCERE_CONFIRM_CAP_INDIV,
    // deductions.ts가 쓰는 1화 값
    BASIC_DEDUCTION_SELF,
    EARNED_INCOME_DEDUCTION: corpRates.EARNED_INCOME_DEDUCTION,
    EARNED_INCOME_TAX_CREDIT: corpRates.EARNED_INCOME_TAX_CREDIT,
    STANDARD_TAX_CREDIT_BIZ: corpRates.STANDARD_TAX_CREDIT_BIZ,
    STANDARD_TAX_CREDIT_WORKER: corpRates.STANDARD_TAX_CREDIT_WORKER,
    YELLOW_UMBRELLA_CAPS: corpRates.YELLOW_UMBRELLA_CAPS,
    YELLOW_UMBRELLA_CONTRIBUTION_MAX: corpRates.YELLOW_UMBRELLA_CONTRIBUTION_MAX,
  },
  vat: { ...vatRates },
  "funds-source": { ...fundsRates },
  "gift-inheritance": { ...giftRates },
  financial: { ...finRates },
  retirement: { ...retireRates },
  "rental-entity": {
    ...rentalRates,
    // 법인세율표는 함수로 만들어지므로 결과를 직접 넣는다
    CORP_BRACKETS_GENERAL: rentalRates.corporateBrackets(false, false),
    CORP_BRACKETS_SMALL: rentalRates.corporateBrackets(true, false),
    CORP_BRACKETS_GENERAL_LOCAL: rentalRates.corporateBrackets(false, true),
    CORP_BRACKETS_SMALL_LOCAL: rentalRates.corporateBrackets(true, true),
  },
  "loan-to-owner": { ...loanRates },
  "startup-relief": { ...startupRates },
  "sincere-filing": { ...sincereRates },
  "housing-tax": { ...housingRates },
  "family-succession": { ...successionRates },
  "audit-risk": { ...auditRates },
  "expense-check": { ...expenseRates },
  "family-payroll": { ...payrollRates },
  "tax-calendar": { ...calendarRates },
  "filing-checklist": { ...checklistRates },
  withholding: { ...withholdingRates },
};

const EXPECTED: Record<string, { version: string; fingerprint: string }> = {
  "corp-conversion": { version: "2026-4", fingerprint: "893738824f8abaa1" },
  goodwill: { version: "2026-3", fingerprint: "1aba9d7a9ea671a7" },
  "capital-gains": { version: "2026-3", fingerprint: "7d3c6f9ec43b8552" },
  "comprehensive-income": { version: "2026-1", fingerprint: "d93209369d0a7e8b" },
  vat: { version: "2026-1", fingerprint: "8ec9c98b3602af79" },
  "funds-source": { version: "2026-1", fingerprint: "7d408e27655ec6f2" },
  "gift-inheritance": { version: "2026-2", fingerprint: "cf36f205b3c8df24" },
  financial: { version: "2026-1", fingerprint: "6e3d764bd39a5bd2" },
  retirement: { version: "2026-1", fingerprint: "57dfd5e897838bc8" },
  "rental-entity": { version: "2026-10-17.1", fingerprint: "95e1b6bd6d5dfa47" },
  "loan-to-owner": { version: "2026-1", fingerprint: "c95fed2dc77e0b51" },
  "startup-relief": { version: "2026-1", fingerprint: "7d8b5b11848a0b3b" },
  "sincere-filing": { version: "2026-1", fingerprint: "158b7b74989827b8" },
  "housing-tax": { version: "2026-10-17.1", fingerprint: "0460722913dd1323" },
  "family-succession": { version: "2026-1", fingerprint: "6f2871d500f650bb" },
  "audit-risk": { version: "2026-1", fingerprint: "c439096042430c22" },
  "expense-check": { version: "2026-10-17.1", fingerprint: "d08216a21a2337dd" },
  "family-payroll": { version: "2026-1", fingerprint: "7af6fcc8e8b355ea" },
  "tax-calendar": { version: "2026-10-17.1", fingerprint: "8fffc7c15185107c" },
  "filing-checklist": { version: "2026-1", fingerprint: "c1cddb4499cc4a72" },
  withholding: { version: "2026-1", fingerprint: "1d10c1b161afa1cf" },
};

describe("제품별 세율 버전 가드", () => {
  it("21편 전부 지문이 등록돼 있다 (새 제품을 추가하면 DEPS·EXPECTED에도 넣는다)", () => {
    expect(Object.keys(DEPS).sort()).toEqual(PRODUCTS.map((p) => p.slug).sort());
    expect(Object.keys(EXPECTED).sort()).toEqual(PRODUCTS.map((p) => p.slug).sort());
  });

  for (const p of PRODUCTS) {
    it(`${p.number}화 ${p.name}: 법령 값이 바뀌면 세율 버전도 올려야 한다`, () => {
      expect({ version: p.ratesVersion, fingerprint: fingerprint(DEPS[p.slug] ?? {}) }).toEqual(EXPECTED[p.slug]);
    });
  }

  it("1화 전용 값만 바뀌면 2·3·4화 지문은 그대로다 (공유 값만 포함)", () => {
    expect(Object.keys(DEPS["capital-gains"])).not.toContain("DIVIDEND_GROSSUP");
    expect(Object.keys(DEPS.goodwill)).not.toContain("YELLOW_UMBRELLA_CAPS");
    expect(Object.keys(DEPS["comprehensive-income"])).not.toContain("CORP_TAX_BRACKETS");
  });

  it("지문은 값에만 반응한다: 근거 메타만 바뀌면 그대로, 값이 바뀌면 달라진다", () => {
    const base = { A: { value: 100, basis: { kind: "law", confirmedAt: "2026-10-16" } } };
    const metaOnly = { A: { value: 100, basis: { kind: "law", confirmedAt: "2026-11-02" } } };
    const valueChanged = { A: { value: 101, basis: { kind: "law", confirmedAt: "2026-10-16" } } };
    expect(fingerprint(metaOnly)).toBe(fingerprint(base));
    expect(fingerprint(valueChanged)).not.toBe(fingerprint(base));
  });
});
