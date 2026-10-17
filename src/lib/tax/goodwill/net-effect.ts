import { traced, type Traced } from "../trace";
import { corpAmortizationSaving, type CorpGoodwillSaving } from "./corp-side";
import { personalTaxOnGoodwill, type PersonalGoodwillTax } from "./income-tax-path";
import { valueGoodwill, type GoodwillValuation } from "./valuation";

export type GoodwillInput = {
  /** 순손익 [직전 1년, 직전 2년, 직전 3년] */
  netIncomes: [number, number, number];
  equity: number;
  /** 대표의 다른 종합소득(사업·근로 등 합계) */
  otherComprehensiveIncome: number;
  /** 법인 예상 과세표준(영업권 상각 전) */
  corpTaxBase: number;
  /** 사업장 부동산을 함께 양도 → 양도소득 경로(범위 밖) */
  withRealEstate: boolean;
  /** 법인 절세 현가 할인율. 기본 0 */
  discountRate?: number;
};

export type GoodwillResult = {
  valuation: GoodwillValuation;
  personal: PersonalGoodwillTax;
  corp: CorpGoodwillSaving;
  /** 법인 5년 절세(명목) − 개인 세부담 */
  netEffect: Traced;
  cashFlow: { corpOutflow: Traced; ownerInflow: Traced };
  verdict: { tone: "positive" | "none"; text: string };
  /** 부동산 함께 양도 → 계산 결과를 결론으로 쓰지 말 것 */
  outOfScope: boolean;
};

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");

export const EMPTY_GOODWILL_INPUT: GoodwillInput = {
  netIncomes: [0, 0, 0],
  equity: 0,
  otherComprehensiveIncome: 0,
  corpTaxBase: 0,
  withRealEstate: false,
  discountRate: 0,
};

export function runGoodwill(input: GoodwillInput): GoodwillResult {
  const valuation = valueGoodwill({ netIncomes: input.netIncomes, equity: input.equity });
  const price = valuation.goodwill.value;
  const personal = personalTaxOnGoodwill(price, input.otherComprehensiveIncome);
  const corp = corpAmortizationSaving(price, input.corpTaxBase, input.discountRate ?? 0);

  const net = corp.fiveYearNominal.value - personal.personalTax.value;
  const netEffect = traced(
    "순효과 (법인 5년 절세 − 개인 세부담)",
    net,
    [`${won(corp.fiveYearNominal.value)} − ${won(personal.personalTax.value)} = ${won(net)}`, "명목 합계 기준. 현가는 법인 절세 항목 참고"],
    [],
  );

  const corpOutflow = traced(
    "법인 현금 유출 (영업권 양도대금 지급)",
    price,
    ["법인이 개인에게 실제로 지급해야 하는 돈. 미지급·장기 미지급금으로 두면 가지급금·인정이자 등 별도 문제"],
    [],
  );
  const ownerInflow = traced(
    "개인 현금 유입 (양도대금 − 원천징수)",
    price - personal.withholding.value,
    [`${won(price)} − 원천징수 ${won(personal.withholding.value)} = ${won(price - personal.withholding.value)}`],
    [],
  );

  const verdict = input.withRealEstate
    ? {
        tone: "none" as const,
        text: "사업장 부동산을 함께 넘기면 대표 세금을 계산하는 방식이 달라져, 이 계산으로는 실익을 판단할 수 없습니다. 세무사 확인이 필요합니다.",
      }
    : price > 0 && net > 0
      ? {
          tone: "positive" as const,
          text: "이 조건에서는 영업권 양도를 검토할 가치가 있습니다. 실제 진행 여부와 금액은 세무사 확인이 필요합니다.",
        }
      : {
          tone: "none" as const,
          text:
            price <= 0
              ? "이 조건에서는 영업권 평가액이 0이라 실익이 없습니다. 자기자본 대비 이익이 크지 않은 경우이며, 세무사 확인이 필요합니다."
              : "이 조건에서는 실익이 없습니다. 개인이 내는 세금이 법인이 아끼는 세금보다 큽니다. 세무사 확인이 필요합니다.",
        };

  return {
    valuation,
    personal,
    corp,
    netEffect,
    cashFlow: { corpOutflow, ownerInflow },
    verdict,
    outOfScope: input.withRealEstate,
  };
}
