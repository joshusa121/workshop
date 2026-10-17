export { annuityFactor, valueGoodwill } from "./valuation";
export type { GoodwillValuation, GoodwillValuationInput } from "./valuation";
export { personalTaxOnGoodwill } from "./income-tax-path";
export type { PersonalGoodwillTax } from "./income-tax-path";
export { corpAmortizationSaving } from "./corp-side";
export type { CorpGoodwillSaving } from "./corp-side";
export { EMPTY_GOODWILL_INPUT, runGoodwill } from "./net-effect";
export type { GoodwillInput, GoodwillResult } from "./net-effect";
export { decodeGoodwill, encodeGoodwill } from "./share";
