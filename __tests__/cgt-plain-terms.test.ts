/**
 * 쉬운 용어·어미 규칙 (docs/verified/plain-terms.md, Josh 승인 2026-09-26) — 3화 양도세판.
 * 1화 __tests__/plain-terms.test.ts와 같은 규칙을 3화 경로에 적용한다.
 * ① 정적 검사: src/components/capital-gains/**, src/app/tools/capital-gains/** (Phase 2에서 생김)
 * ② 실행 검사: 엔진이 화면에 내보내는 판정 문장(status·exemption·surcharge reasons, notes, unverified)
 * 예외: Traced steps·basis(근거 팝오버, 세무사용).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeCgt, type CgtResult } from "../src/lib/tax/cgt/cgt";
import type { CgtInput } from "../src/lib/tax/cgt/input";

const FORBIDDEN = ["손금불산입", "손금", "익금", "산입", "상여 처분", "가지급금", "과세표준", "산출세액", "가처분", "유보", "결손", "필요경비"];

function stripParens(s: string): string {
  return s.replace(/[（(][^()（）]*[)）]/g, "");
}

/** 「~ㅂ니다」의 '니' 앞 음절은 받침 ㅂ */
function isPoliteNida(text: string, idx: number): boolean {
  if (text[idx - 1] !== "니") return false;
  const prev = text.charCodeAt(idx - 2);
  if (prev < 0xac00 || prev > 0xd7a3) return false;
  return (prev - 0xac00) % 28 === 17;
}

/** "~다" 종결 찾기. 1화 규칙 + 조문 인용 괄호 앞(…양도한다(§89…)도 잡는다 */
function plainEndings(text: string): string[] {
  const hits: string[] = [];
  const re = /[가-힣]다(?=[.!?\s"'`」)(<—,]|$)/g;
  for (const m of text.matchAll(re)) {
    const idx = (m.index ?? 0) + 1;
    if (isPoliteNida(text, idx)) continue;
    if (text[idx - 1] === "보" || text[idx - 1] === "마") continue;
    hits.push(text.slice(Math.max(0, idx - 24), idx + 1).replace(/\s+/g, " ").trim());
  }
  return hits;
}

// ── ① 정적 검사 ──
const UI_DIRS = ["src/components/capital-gains", "src/app/tools/capital-gains"].map((d) => join(process.cwd(), d));
const UI_FILES = UI_DIRS.filter((d) => existsSync(d)).flatMap((d) =>
  readdirSync(d, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
    .map((f) => join(d, f)),
);

function sourceText(src: string, ignoreTag: string): string {
  return src
    .split("\n")
    .filter((line) => !line.includes(ignoreTag))
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .map((line) => line.replace(/\s\/\/.*$/, ""))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("3화 화면 파일 — 금지 용어·어미", () => {
  if (UI_FILES.length === 0) {
    it("Phase 2 전: 대상 파일 없음 (화면을 만들면 자동으로 검사 대상이 된다)", () => {
      expect(UI_FILES).toEqual([]);
    });
  }
  for (const file of UI_FILES) {
    const rel = file.replace(process.cwd(), "");
    it(`${rel} 금지 용어`, () => {
      const text = stripParens(sourceText(readFileSync(file, "utf8"), "plain-terms-ignore"));
      const hits = FORBIDDEN.filter((t) => text.includes(t));
      expect(hits, `금지 용어 발견: ${hits.join(", ")}`).toEqual([]);
    });
    it(`${rel} ~합니다체`, () => {
      const hits = plainEndings(sourceText(readFileSync(file, "utf8"), "tone-ignore"));
      expect(hits, `반말체 종결 발견:\n${hits.join("\n")}`).toEqual([]);
    });
  }
});

// ── ② 실행 검사: 판정 분기를 넓게 도는 입력 묶음 ──
function mk(s: Partial<CgtInput["subject"]>, h: Partial<CgtInput["household"]> = {}, extra: Partial<CgtInput> = {}): CgtInput {
  return {
    subject: {
      kind: "house", acquiredAt: "2018-05-10", transferredAt: "2026-09-01", acquisitionPrice: 600_000_000, transferPrice: 1_000_000_000,
      capitalExpenditure: 0, transferCost: 0, residenceMonths: 0, adjustedAtAcquisition: false, adjustedAtTransfer: false, registered: true, ...s,
    },
    household: { others: [], special: { type: "none" }, ...h },
    ...extra,
  };
}
const other = (acquiredAt: string, o: Partial<CgtInput["household"]["others"][number]> = {}) => ({ kind: "house" as const, acquiredAt, ...o });
const rd = (o: Partial<NonNullable<CgtInput["redevelopment"]>> = {}): NonNullable<CgtInput["redevelopment"]> => ({
  role: "original", approvalDate: "2022-06-01", appraisal: 700_000_000, settlement: { type: "received", amount: 100_000_000 }, transferAsNewHouse: false, ...o,
});

const CASES: [string, CgtInput][] = [
  ["1주택 비과세", mk({})],
  ["1주택 고가", mk({ transferPrice: 2_000_000_000, residenceMonths: 125, acquiredAt: "2016-03-02" })],
  ["1주택 표1(거주 부족)", mk({ transferPrice: 1_500_000_000, residenceMonths: 12 })],
  ["1주택 1년 미만", mk({ acquiredAt: "2026-01-10" })],
  ["조정 취득 거주 부족", mk({ adjustedAtAcquisition: true, residenceMonths: 5 })],
  ["조정 취득 거주 충족", mk({ adjustedAtAcquisition: true, residenceMonths: 30 })],
  ["미등기", mk({ registered: false })],
  ["분양권", mk({ kind: "presale", acquiredAt: "2024-02-01" })],
  ["2021 전 분양권 보유", mk({}, { others: [other("2020-05-01", { kind: "presale" })] })],
  ["일시적 2주택 충족", mk({ acquiredAt: "2020-01-15", transferredAt: "2026-04-30" }, { others: [other("2023-06-01")], special: { type: "temporary" } })],
  ["일시적 2주택 기한 도과", mk({ acquiredAt: "2020-01-15" }, { others: [other("2023-06-01")], special: { type: "temporary" } })],
  ["일시적 2주택 1년 미경과", mk({ acquiredAt: "2020-01-15" }, { others: [other("2020-06-01")], special: { type: "temporary" } })],
  ["상속 특례 충족", mk({}, { others: [other("2022-01-01", { inherited: true })], special: { type: "inherited" } })],
  ["상속 특례 불충족", mk({}, { others: [other("2015-01-01")], special: { type: "inherited" } })],
  ["혼인 충족", mk({}, { others: [other("2017-01-01")], special: { type: "marriage", eventDate: "2019-01-01" } })],
  ["혼인 기한 도과", mk({ acquiredAt: "2010-01-01" }, { others: [other("2012-01-01")], special: { type: "marriage", eventDate: "2014-01-01" } })],
  ["동거봉양 구조 불충족", mk({}, { others: [other("2022-01-01")], special: { type: "cohabitation", eventDate: "2019-01-01" } })],
  ["2주택 특례 없음", mk({}, { others: [other("2023-06-01")] })],
  ["3주택", mk({}, { others: [other("2023-06-01"), other("2021-06-01")] })],
  ["조정 2주택 중과", mk({ adjustedAtTransfer: true }, { others: [other("2023-06-01")] })],
  ["조정 2주택 유예", mk({ adjustedAtTransfer: true, transferredAt: "2026-04-30" }, { others: [other("2023-06-01")] })],
  ["조정 2주택 1년 보유", mk({ adjustedAtTransfer: true, acquiredAt: "2025-06-01" }, { others: [other("2023-06-01")] })],
  ["다목 충족", mk({ adjustedAtTransfer: true, transferredAt: "2026-08-31" }, { others: [other("2023-06-01")] }, { transitional: { contractDate: "2026-05-01", landPermit: false, sixMonthRegion: false } })],
  ["다목 기한 도과", mk({ adjustedAtTransfer: true }, { others: [other("2023-06-01")] }, { transitional: { contractDate: "2026-05-01", landPermit: false, sixMonthRegion: false } })],
  ["다목 늦은 계약", mk({ adjustedAtTransfer: true }, { others: [other("2023-06-01")] }, { transitional: { contractDate: "2026-05-20", landPermit: false, sixMonthRegion: false } })],
  ["나목 충족", mk({ adjustedAtTransfer: true }, { others: [other("2023-06-01")] }, { transitional: { contractDate: "2026-06-01", landPermit: true, permitAppliedAt: "2026-05-08", sixMonthRegion: true } })],
  ["나목 신청 늦음", mk({ adjustedAtTransfer: true }, { others: [other("2023-06-01")] }, { transitional: { contractDate: "2026-06-01", landPermit: true, permitAppliedAt: "2026-05-20", sixMonthRegion: true } })],
  ["나목 기한 도과", mk({ adjustedAtTransfer: true, transferredAt: "2026-11-20" }, { others: [other("2023-06-01")] }, { transitional: { contractDate: "2026-06-01", landPermit: true, permitAppliedAt: "2026-05-08", sixMonthRegion: true } })],
  ["특례인데 조정 2주택", mk({ adjustedAtTransfer: true, acquiredAt: "2020-01-15", transferredAt: "2026-04-30" }, { others: [other("2023-06-01")], special: { type: "temporary" } })],
  ["원조합원 입주권 과세", mk({ kind: "right", acquiredAt: "2012-04-01", transferPrice: 900_000_000, acquisitionPrice: 300_000_000 }, { others: [other("2020-03-01")] }, { redevelopment: rd() })],
  ["원조합원 입주권 비과세", mk({ kind: "right", acquiredAt: "2012-04-01", transferPrice: 900_000_000, acquisitionPrice: 300_000_000 }, {}, { redevelopment: rd() })],
  ["입주권 3년 내", mk({ kind: "right", acquiredAt: "2012-04-01", transferPrice: 900_000_000, acquisitionPrice: 300_000_000 }, { others: [other("2025-01-01")] }, { redevelopment: rd() })],
  ["입주권 기존주택 2년 미만", mk({ kind: "right", acquiredAt: "2021-01-01", transferPrice: 900_000_000, acquisitionPrice: 300_000_000 }, {}, { redevelopment: rd() })],
  ["입주권 조정 거주 부족", mk({ kind: "right", acquiredAt: "2012-04-01", adjustedAtAcquisition: true, transferPrice: 900_000_000, acquisitionPrice: 300_000_000 }, {}, { redevelopment: rd() })],
  ["입주권 다주택", mk({ kind: "right", acquiredAt: "2012-04-01" }, { others: [other("2020-03-01"), other("2021-03-01")] }, { redevelopment: rd() })],
  ["승계 입주권", mk({ kind: "right", acquiredAt: "2023-01-01" }, {}, { redevelopment: rd({ role: "successor" }) })],
  ["원조합원 신축 청산금 납부", mk({ acquiredAt: "2012-04-01", transferPrice: 1_500_000_000, acquisitionPrice: 300_000_000 }, { others: [other("2020-03-01")] }, { redevelopment: rd({ transferAsNewHouse: true, settlement: { type: "paid", amount: 100_000_000 }, completionDate: "2025-06-01" }) })],
  ["원조합원 신축 청산금 수령", mk({ acquiredAt: "2012-04-01", transferPrice: 1_500_000_000, acquisitionPrice: 300_000_000 }, { others: [other("2020-03-01")] }, { redevelopment: rd({ transferAsNewHouse: true, completionDate: "2025-06-01" }) })],
  ["승계 신축", mk({ acquiredAt: "2023-01-01" }, {}, { redevelopment: rd({ role: "successor", transferAsNewHouse: true, completionDate: "2025-06-01" }) })],
];

function messages(r: CgtResult): string[] {
  return [...r.status.reasons, ...r.exemption.reasons, ...r.surcharge.reasons, ...r.notes, ...r.unverified];
}

describe("엔진 판정 문장 — 금지 용어·~합니다체", () => {
  for (const [name, input] of CASES) {
    it(name, () => {
      const msgs = messages(computeCgt(input));
      expect(msgs.length).toBeGreaterThan(0);
      const termHits = msgs.flatMap((m) => FORBIDDEN.filter((t) => stripParens(m).includes(t)).map((t) => `${t}: ${m}`));
      expect(termHits, `금지 용어:\n${termHits.join("\n")}`).toEqual([]);
      const toneHits = msgs.flatMap((m) => plainEndings(m).map((h) => `${h}  ⟵ ${m}`));
      expect(toneHits, `반말체:\n${toneHits.join("\n")}`).toEqual([]);
    });
  }
});
