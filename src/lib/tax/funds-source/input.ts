export type FundsSourceInput = {
  /** 취득재산 가액 */
  acquisitionValue: number;
  /** ① 신고·과세받은 소득금액 */
  provenIncome: number;
  /** ② 신고·과세받은 상속·수증재산 가액 */
  provenInheritance: number;
  /** ③ 재산 처분대가·부채부담 금전으로 취득에 직접 사용한 금액 */
  provenDisposal: number;
  /** 취득일 전 10년 이내 취득자금 합계 (소액 배제 판정용) */
  fundsWithin10y: number;
};

export const DEFAULT_FUNDS_SOURCE: FundsSourceInput = {
  acquisitionValue: 500_000_000,
  provenIncome: 100_000_000,
  provenInheritance: 50_000_000,
  provenDisposal: 100_000_000,
  fundsWithin10y: 250_000_000,
};

export function normalizeFundsSource(input: Partial<FundsSourceInput>): FundsSourceInput {
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const m = { ...DEFAULT_FUNDS_SOURCE, ...input };
  return {
    acquisitionValue: num(m.acquisitionValue),
    provenIncome: num(m.provenIncome),
    provenInheritance: num(m.provenInheritance),
    provenDisposal: num(m.provenDisposal),
    fundsWithin10y: num(m.fundsWithin10y),
  };
}
