import { describe, expect, it } from "vitest";
import { computeFamilySuccession } from "@/lib/tax/family-succession/engine";
import { SAMPLE_FAMILY_SUCCESSION as sample, inputErrors } from "@/lib/tax/family-succession/input";
import { encodeFamilySuccession, decodeFamilySuccession } from "@/lib/tax/family-succession/share";

describe("가업승계 독립 손계산 fixture", () => {
  it.each([
    ["10년 직전", 9.99, 50_000_000_000, 0, "ineligible"],
    ["10년 경계", 10, 50_000_000_000, 30_000_000_000, "eligible"],
    ["20년 직전", 19.99, 50_000_000_000, 30_000_000_000, "eligible"],
    ["20년 경계", 20, 50_000_000_000, 40_000_000_000, "eligible"],
    ["30년 경계", 30, 70_000_000_000, 60_000_000_000, "eligible"],
    ["재산이 한도 미만", 30, 7_000_000_000, 7_000_000_000, "eligible"],
  ] as const)("상속 %s", (_, businessYears, eligibleValue, deduction, status) => {
    const r = computeFamilySuccession({ ...sample, businessYears, shareHoldingYears: businessYears, ownerRepresentativeLastTen: Math.min(10, businessYears), ownerRepresentativeYears: businessYears, eligibleValue });
    expect(r.status).toBe(status); expect(r.appliedDeduction.value).toBe(deduction);
  });
  it.each([
    ["공제액 이하", 900_000_000, 0, 0],
    ["10억원 경계", 1_000_000_000, 0, 0],
    ["과표 120억원 경계", 13_000_000_000, 12_000_000_000, 1_200_000_000],
    ["과표 120억원 초과", 14_000_000_000, 13_000_000_000, 1_400_000_000],
    ["300억원 한도 초과", 35_000_000_000, 29_000_000_000, 4_600_000_000],
  ])("증여 %s", (_, eligibleValue, base, tax) => {
    const r = computeFamilySuccession({ ...sample, mode: "gift", businessYears: 10, shareHoldingYears: 10, ownerRepresentativeYears: 10, eligibleValue });
    expect(r.status).toBe("eligible"); expect(r.giftTaxBase.value).toBe(base); expect(r.giftTax.value).toBe(tax);
  });
});
describe("가업승계 요건·공유 안전성", () => {
  it("미확인은 충족으로 처리하지 않는다", () => {
    const r = computeFamilySuccession({ ...sample, enterprise: "unknown" });
    expect(r.status).toBe("review"); expect(r.appliedDeduction.value).toBe(0); expect(r.potentialBenefit.value).toBe(30_000_000_000);
  });
  it("실패와 미확인이 함께 있으면 실패를 우선한다", () => {
    expect(computeFamilySuccession({ ...sample, enterprise: "unknown", recipientAge: 17 }).status).toBe("ineligible");
  });
  it.each([[39.99, false, "ineligible"], [40, false, "eligible"], [19.99, true, "ineligible"], [20, true, "eligible"]] as const)("지분 경계 %s 상장 %s", (familySharePercent, listed, status) => {
    expect(computeFamilySuccession({ ...sample, familySharePercent, listed }).status).toBe(status);
  });
  it("사전종사는 2년, 65세 이전 사망은 예외", () => {
    expect(computeFamilySuccession({ ...sample, recipientWorkYears: 1.99 }).status).toBe("ineligible");
    expect(computeFamilySuccession({ ...sample, recipientWorkYears: 0, ownerAge: 64 }).status).toBe("eligible");
    expect(computeFamilySuccession({ ...sample, recipientWorkYears: 0, ownerAge: 65 }).status).toBe("ineligible");
  });
  it("증여는 부모 60세·수증자 18세 이상", () => {
    expect(computeFamilySuccession({ ...sample, mode: "gift", ownerAge: 59 }).status).toBe("ineligible");
    expect(computeFamilySuccession({ ...sample, mode: "gift", ownerAge: 60, recipientAge: 18, recipientWorkYears: 0 }).status).toBe("eligible");
  });
  it("중견기업 매출 5천억원 미만 및 납부능력 경계", () => {
    const mid = { ...sample, companySize: "mid" as const, averageRevenue: 499_999_999_999, otherEstate: 2_000_000_000, inheritanceTaxWithoutRelief: 1_000_000_000 };
    expect(computeFamilySuccession(mid).status).toBe("eligible");
    expect(computeFamilySuccession({ ...mid, averageRevenue: 500_000_000_000 }).status).toBe("ineligible");
    expect(computeFamilySuccession({ ...mid, otherEstate: 2_000_000_001 }).status).toBe("ineligible");
    expect(computeFamilySuccession({ ...mid, mode: "gift", otherEstate: 9_000_000_000 }).status).toBe("eligible");
  });
  it("증여에는 상속 전용 대표 재직 예외를 적용하지 않는다", () => {
    const i = { ...sample, businessYears: 30, ownerRepresentativeYears: 10, ownerRepresentativeLastTen: 0, successorContinuous: "yes" as const };
    expect(computeFamilySuccession(i).status).toBe("eligible");
    expect(computeFamilySuccession({ ...i, mode: "gift" }).status).toBe("ineligible");
  });
  it("증여 개인사업 자산은 대상이 아니다", () => expect(computeFamilySuccession({ ...sample, mode: "gift", legalForm: "individual" }).status).toBe("ineligible"));
  it("음수·NaN·무한대·불가능한 대표기간을 거부한다", () => {
    for (const eligibleValue of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(inputErrors({ ...sample, eligibleValue }).length).toBeGreaterThan(0);
    expect(inputErrors({ ...sample, ownerRepresentativeLastTen: 11 }).length).toBeGreaterThan(0);
    expect(computeFamilySuccession({ ...sample, eligibleValue: -1 }).status).toBe("invalid");
  });
  it("공유 왕복·세율 변경·손상·누락·형식 만료", () => {
    expect(decodeFamilySuccession(encodeFamilySuccession(sample))).toEqual({ ok: true, input: sample, ratesChanged: false });
    expect(decodeFamilySuccession(btoa(JSON.stringify({ v: 1, r: "old", d: sample })))).toMatchObject({ ok: true, ratesChanged: true });
    for (const s of ["!", btoa('{}'), btoa(JSON.stringify({v:1,d:{}})), "a".repeat(12001)]) expect(decodeFamilySuccession(s).ok).toBe(false);
  });
  it("모든 금액과 요건은 사람용 근거를 가진다", () => {
    const r = computeFamilySuccession(sample);
    for (const t of [r.cap, r.potentialBenefit, r.appliedDeduction, r.giftTaxBase, r.giftTax, r.outsideCap, ...r.checks.map(c => c.trace)]) {
      expect(t.basis.length).toBeGreaterThan(0);
      for (const b of t.basis) if (b.kind === "law") { expect(b.url).not.toContain("OC="); expect(b.url).toContain("law.go.kr/법령/"); }
    }
  });
});

describe("추가 경계·보수적 판정", () => {
  it.each([[20, 40_000_000_000, 6_600_000_000], [29.99, 40_000_000_000, 6_600_000_000], [30, 60_000_000_000, 10_600_000_000]])("증여 %s년 한도와 특례 세액", (businessYears, covered, tax) => {
    const r = computeFamilySuccession({ ...sample, mode: "gift", businessYears, ownerRepresentativeYears: businessYears, eligibleValue: 70_000_000_000 });
    expect(r.potentialBenefit.value).toBe(covered); expect(r.giftTax.value).toBe(tax);
  });
  it("대표 재직 절반과 최근 열 해 중 다섯 해 경계", () => {
    expect(computeFamilySuccession({ ...sample, ownerRepresentativeYears: 10, ownerRepresentativeLastTen: 0 }).status).toBe("eligible");
    expect(computeFamilySuccession({ ...sample, ownerRepresentativeYears: 9.99, ownerRepresentativeLastTen: 4.99 }).status).toBe("ineligible");
    expect(computeFamilySuccession({ ...sample, ownerRepresentativeYears: 5, ownerRepresentativeLastTen: 5 }).status).toBe("eligible");
  });
  it("상속 종사기간 예외 미확인은 감수 대상으로 남긴다", () => {
    expect(computeFamilySuccession({ ...sample, recipientWorkYears: 0, exceptionalDeath: "unknown" }).status).toBe("review");
    expect(computeFamilySuccession({ ...sample, recipientWorkYears: 0, exceptionalDeath: "yes" }).status).toBe("eligible");
  });
  it("입력 누락·선택값 손상은 공유 링크에서 차단한다", () => {
    const { appointment, ...missing } = sample; void appointment;
    for (const d of [missing, { ...sample, listed: "true" }, { ...sample, mode: "other" }, { ...sample, resident: true }]) {
      expect(decodeFamilySuccession(btoa(JSON.stringify({v:1,r:"2026-1",d}))).ok).toBe(false);
    }
  });
});

describe("제품 결과 화면", () => {
  it("상속과 증여에서 공제·산출세액 의미를 구분한다", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { FamilySuccessionResult } = await import("@/components/family-succession/FamilySuccessionResult");
    for (const mode of ["inheritance", "gift"] as const) {
      const input = { ...sample, mode };
      const html = renderToStaticMarkup(createElement(FamilySuccessionResult, { input, result: computeFamilySuccession(input) }));
      expect(html).toContain("전제와 미반영"); expect(html).toContain("승계 후에도 지켜야 할 일");
      expect(html).toContain(mode === "gift" ? "특례 부분의 증여세 산출세액" : "상속공제액 (종합한도 적용 전)");
      expect(html).not.toContain("OC=");
    }
  });
  it("미확인·미충족 화면은 가정 계산을 실제 적용액으로 보여주지 않는다", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { FamilySuccessionResult } = await import("@/components/family-succession/FamilySuccessionResult");
    const input = { ...sample, mode: "gift" as const, enterprise: "unknown" as const };
    const html = renderToStaticMarkup(createElement(FamilySuccessionResult, { input, result: computeFamilySuccession(input) }));
    expect(html).toContain("위 금액은 가정 계산"); expect(html).not.toContain("특례 부분의 증여세 산출세액"); expect(html).toContain("Josh 감수");
  });
});
