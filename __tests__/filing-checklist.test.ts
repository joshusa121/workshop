import { describe, expect, it } from "vitest";
import { computeChecklist } from "@/lib/tax/filing-checklist/engine";
import { DEFAULT_INPUT, validateInput, type ChecklistInput } from "@/lib/tax/filing-checklist/input";
import { decodeChecklist, encodeChecklist } from "@/lib/tax/filing-checklist/share";

const input = (patch: Partial<ChecklistInput> = {}): ChecklistInput => ({ ...DEFAULT_INPUT, ...patch, statuses: patch.statuses ?? {} });
const ids = (i: ChecklistInput) => computeChecklist(i).items.map(x => x.id);

describe("독립 손계산 fixture — 서류 목록과 경계", () => {
  const fixtures: [string, Partial<ChecklistInput>, string[]][] = [
    ["일반·간편", {}, ["return", "income", "simple"]],
    ["간이과세자도 복식부기 별도 지정", { profile: "simplified", method: "double" }, ["return", "income", "balance", "profit", "annex", "trial", "adjustment"]],
    ["프리랜서 추계", { profile: "freelancer", method: "estimate" }, ["return", "income", "estimate", "withholding"]],
    ["겸업", { profile: "mixed" }, ["return", "income", "simple", "withholding"]],
    ["성실신고확인", { profile: "sincere", method: "double" }, ["return", "income", "balance", "profit", "annex", "trial", "adjustment", "sincere"]],
    ["수입금액 경계 미만", { previousRevenue: 47_999_999, largestOtherReceipt: 30_001 }, ["return", "income", "simple"]],
    ["수입금액·영수증 경계 일치", { previousRevenue: 48_000_000, largestOtherReceipt: 30_000 }, ["return", "income", "simple"]],
    ["두 경계 충족", { previousRevenue: 48_000_000, largestOtherReceipt: 30_001 }, ["return", "income", "simple", "receipts"]],
    ["신규 개업 제외", { newBusiness: true, previousRevenue: 48_000_000, largestOtherReceipt: 30_001 }, ["return", "income", "simple"]],
    ["사업소득 연말정산 제외", { settledBusinessOnly: true, previousRevenue: 48_000_000, largestOtherReceipt: 30_001 }, ["return", "income", "simple"]],
    ["공제와 특수 필요경비", { claimsDeductions: true, specialExpenses: true }, ["return", "income", "simple", "deductions", "expenses"]],
  ];
  it.each(fixtures)("%s", (_, patch, expected) => {
    const r = computeChecklist(input(patch));
    expect(r.items.map(x => x.id)).toEqual(expected);
    expect(r.total.value).toBe(expected.length);
    expect(r.pending.value).toBe(expected.length);
  });
});

describe("준비 상태와 안전한 공유", () => {
  it("준비 완료와 사용자 판단 불필요 구분", () => {
    const r = computeChecklist(input({ statuses: { return: "ready", income: "unnecessary", balance: "ready" } }));
    expect([r.total.value, r.ready.value, r.unnecessary.value, r.pending.value]).toEqual([3, 1, 1, 1]);
    expect(r.notes.some(n => n.includes("Josh 감수"))).toBe(true);
    expect(ids(input({ profile: "simplified" }))).toEqual(["return", "income", "simple"]);
  });
  it("모두 준비하면 미준비 0", () => {
    const r = computeChecklist(input({ statuses: { return: "ready", income: "ready", simple: "ready" } }));
    expect([r.ready.value, r.pending.value]).toEqual([3, 0]);
  });
  it("공유 링크로 준비 상태까지 복원", () => {
    const i = input({ profile: "mixed", statuses: { return: "ready" } });
    expect(decodeChecklist(encodeChecklist(i))).toEqual({ ok: true, input: i, ratesChanged: false });
  });
  it("과거 근거 버전 경고·과거 형식 거부", () => {
    const pack = (v: number, r: string) => btoa(JSON.stringify({ v, r, d: input() })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    expect(decodeChecklist(pack(1, "old"))).toMatchObject({ ok: true, ratesChanged: true });
    expect(decodeChecklist(pack(99, "old"))).toEqual({ ok: false, reason: "만료된 형식" });
  });
  it.each(["!", "x".repeat(6001), btoa("null"), btoa('{"v":1,"d":{}}')])("손상 링크 거부 %s", code => {
    expect(decodeChecklist(code).ok).toBe(false);
  });
  it.each([{ previousRevenue: -1 }, { largestOtherReceipt: 0.5 }, { previousRevenue: Infinity }, { profile: "unknown" }, { method: "unknown" }, { year: 2025 }, { statuses: { return: "bad" } }, { statuses: { alien: "ready" } }, { claimsDeductions: "yes" }])("잘못된 입력 거부", patch => {
    const i = { ...input(), ...patch };
    expect(validateInput(i).length).toBeGreaterThan(0);
    expect(() => computeChecklist(i as ChecklistInput)).toThrow();
  });
  it("모든 항목과 집계에 근거·사람용 URL 사용", () => {
    const r = computeChecklist(input({ profile: "sincere", method: "double", claimsDeductions: true, specialExpenses: true, previousRevenue: 48_000_000, largestOtherReceipt: 30_001 }));
    for (const t of [...r.items.map(x => x.trace), r.total, r.ready, r.pending, r.unnecessary]) {
      expect(t.basis.length).toBeGreaterThan(0);
      for (const b of t.basis) if (b.kind === "law") expect(b.url).not.toMatch(/OC=|DRF/);
    }
  });
});
