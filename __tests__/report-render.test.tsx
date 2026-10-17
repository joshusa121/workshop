import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CgtResult } from "../src/components/capital-gains/CgtResult";
import { CompIncomeResult } from "../src/components/comp-income/CompIncomeResult";
import { FundsSourceResult } from "../src/components/funds-source/FundsSourceResult";
import { GiftInheritanceResult } from "../src/components/gift-inheritance/GiftInheritanceResult";
import { FinancialResult } from "../src/components/financial/FinancialResult";
import { GoodwillResult } from "../src/components/goodwill/GoodwillResult";
import { VatResult } from "../src/components/vat/VatResult";
import { computeCgt } from "../src/lib/tax/cgt/cgt";
import { SAMPLE_SURCHARGE, SAMPLE_TEMPORARY } from "../src/lib/tax/cgt/defaults";
import { computeCompIncome } from "../src/lib/tax/comp-income/engine";
import { normalizeCompIncome } from "../src/lib/tax/comp-income/input";
import { computeVat } from "../src/lib/tax/vat/engine";
import { normalizeVat } from "../src/lib/tax/vat/input";
import { computeFundsSource } from "../src/lib/tax/funds-source/engine";
import { normalizeFundsSource } from "../src/lib/tax/funds-source/input";
import { computeGiftInheritance } from "../src/lib/tax/gift-inheritance/engine";
import { normalizeGiftInheritance } from "../src/lib/tax/gift-inheritance/input";
import { computeFinancial } from "../src/lib/tax/financial/engine";
import { normalizeFinancial } from "../src/lib/tax/financial/input";
import { runGoodwill, type GoodwillInput } from "../src/lib/tax/goodwill/net-effect";

const GW: GoodwillInput = {
  netIncomes: [150_000_000, 120_000_000, 100_000_000],
  equity: 200_000_000,
  otherComprehensiveIncome: 0,
  corpTaxBase: 200_000_000,
  withRealEstate: false,
  discountRate: 0,
};

describe("보고서·결과 화면 렌더 (차트 포함)", () => {
  it("2화: 영업권 결과 + 그림 3개가 렌더된다", () => {
    const html = renderToString(<GoodwillResult input={GW} result={runGoodwill(GW)} />);
    expect(html).toContain("그림으로 보기");
    expect(html).toContain("최근 3년 이익");
    expect(html).toContain("영업권이 나오는 과정");
    expect(html).toContain("5년에 걸쳐 아끼는 세금");
    expect(html).toContain("영업권 평가액");
  });

  it("3화 일시적 2주택: 결과 + 그림(양도차익 구성·세액 구성)이 렌더된다", () => {
    const html = renderToString(<CgtResult input={SAMPLE_TEMPORARY} result={computeCgt(SAMPLE_TEMPORARY)} />);
    expect(html).toContain("그림으로 보기");
    expect(html).toContain("양도차익이 나뉘는 모습");
    expect(html).toContain("양도차익 구성");
    expect(html).toContain("날짜로 본 판정");
  });

  it("3화 중과: 세액 구성 그림이 렌더된다", () => {
    const r = computeCgt(SAMPLE_SURCHARGE);
    const html = renderToString(<CgtResult input={SAMPLE_SURCHARGE} result={r} />);
    expect(html).toContain("그림으로 보기");
    if (r.total.value > 0) expect(html).toContain("낼 세금의 구성");
  });

  it("4화: 종합소득세 결과가 렌더된다(납부/환급·전제)", () => {
    const input = normalizeCompIncome({ revenue: 90_000_000, expenses: 22_000_000, spouse: true, dependents: 1, children8Plus: 1 });
    const html = renderToString(<CompIncomeResult input={input} result={computeCompIncome(input)} />);
    expect(html).toContain("예상 결과");
    expect(html).toContain("낼 세금 합계");
    expect(html).toContain("전제와 미반영");
    expect(html).toContain("기납부 원천징수");
  });

  it("5화: 부가가치세 비교가 렌더된다", () => {
    const input = normalizeVat({ industry: "retail", annualRevenue: 95_000_000, purchaseWithInvoice: 40_000_000 });
    const html = renderToString(<VatResult input={input} result={computeVat(input)} />);
    expect(html).toContain("일반과세");
    expect(html).toContain("간이과세");
    expect(html).toContain("전제와 미반영");
  });
  it("6화: 자금출처 진단이 렌더된다", () => {
    const input = normalizeFundsSource({ acquisitionValue: 600_000_000, provenIncome: 180_000_000 });
    const html = renderToString(<FundsSourceResult input={input} result={computeFundsSource(input)} />);
    expect(html).toContain("자금출처 자기진단");
    expect(html).toContain("소명(입증) 내역");
    expect(html).toContain("증여추정 대상액");
  });
  it("7화: 증여 vs 상속 비교가 렌더된다", () => {
    const input = normalizeGiftInheritance({ assets: 2_000_000_000, tranches: 2 });
    const html = renderToString(<GiftInheritanceResult input={input} result={computeGiftInheritance(input)} />);
    expect(html).toContain("세 가지 방법 비교");
    expect(html).toContain("전액 상속");
    expect(html).toContain("전제와 미반영");
  });
  it("8화: 금융투자 세금이 렌더된다", () => {
    const input = normalizeFinancial({ interest: 30_000_000, dividend: 30_000_000, otherIncome: 50_000_000, stockGain: 200_000_000 });
    const html = renderToString(<FinancialResult input={input} result={computeFinancial(input)} />);
    expect(html).toContain("금융소득");
    expect(html).toContain("주식 양도세");
    expect(html).toContain("전제와 미반영");
  });
});
