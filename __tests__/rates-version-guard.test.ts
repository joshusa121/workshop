import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as cgtRates from "../src/lib/tax/cgt/rates-cgt";
import { CGT_RATES_VERSION } from "../src/lib/tax/cgt/version";
import * as goodwillFacts from "../src/lib/tax/goodwill/facts";
import { BASIC_DEDUCTION_SELF, CORP_TAX_BRACKETS, INCOME_TAX_BRACKETS, LOCAL_TAX_RATE } from "../src/lib/tax/rates";

/**
 * 제품별 세율 버전 가드 (Josh 2026-09-26: 제품마다 세율 버전 분리).
 * 제품이 쓰는 세율 값(자기 모듈 + 1화와 공유하는 값)의 지문을 버전과 함께 고정한다.
 * 값이 바뀌었는데 이 테스트가 실패하면: 해당 제품의 *_RATES_VERSION 을 올리고 아래 기대 지문을 갱신한다.
 */
function fingerprint(entries: Record<string, unknown>): string {
  const values = Object.keys(entries)
    .sort()
    .map((k) => {
      const e = entries[k] as { value?: unknown } | undefined;
      return [k, e && typeof e === "object" && "value" in e ? e.value : null];
    })
    .filter(([, v]) => v !== null);
  return createHash("sha256").update(JSON.stringify(values)).digest("hex").slice(0, 16);
}

const cgtDeps = { ...cgtRates, INCOME_TAX_BRACKETS, LOCAL_TAX_RATE };
const goodwillDeps = { ...goodwillFacts, INCOME_TAX_BRACKETS, CORP_TAX_BRACKETS, LOCAL_TAX_RATE, BASIC_DEDUCTION_SELF };

const EXPECTED = {
  cgt: { version: "2026-3", fingerprint: "b3c9e03b0bf3f9ca" },
  goodwill: { version: "2026-3", fingerprint: "6af2aeb37c5ea6ca" },
};

describe("제품별 세율 버전 가드", () => {
  it("3화: 세율 값이 바뀌면 CGT_RATES_VERSION 도 올려야 한다", () => {
    expect({ version: CGT_RATES_VERSION, fingerprint: fingerprint(cgtDeps) }).toEqual(EXPECTED.cgt);
  });
  it("2화: 세율 값이 바뀌면 GOODWILL_RATES_VERSION 도 올려야 한다", () => {
    expect({ version: goodwillFacts.GOODWILL_RATES_VERSION, fingerprint: fingerprint(goodwillDeps) }).toEqual(EXPECTED.goodwill);
  });
  it("1화 전용 값만 바뀌면 2화·3화 지문은 그대로다 (공유 값만 포함)", () => {
    expect(Object.keys(cgtDeps)).not.toContain("DIVIDEND_GROSSUP");
    expect(Object.keys(goodwillDeps)).not.toContain("YELLOW_UMBRELLA_CAPS");
  });
});
