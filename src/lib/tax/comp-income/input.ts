export type CompIncomeInput = {
  /** 사업 수입금액 (총수입금액) */
  revenue: number;
  /** 실제 필요경비 (경비율 자동반영 없음) */
  expenses: number;
  /** 근로 총급여 (0이면 사업소득만) */
  grossSalary: number;
  /** 배우자 기본공제 여부 (소득요건 충족 전제) */
  spouse: boolean;
  /** 부양가족 수 (본인·배우자 제외, 소득요건 충족 전제) */
  dependents: number;
  /** 경로우대자(70세↑) 수 — 추가공제 100만/명 */
  elderly: number;
  /** 장애인 수 — 추가공제 200만/명 */
  disabled: number;
  /** 부녀자 추가공제 50만 */
  femaleHead: boolean;
  /** 한부모 추가공제 100만 (부녀자와 중복 시 이 항목만) */
  singleParent: boolean;
  /** 자녀세액공제 대상 자녀(8세↑) 수 */
  children8Plus: number;
  /** 국민연금 본인부담 납입액 (연금보험료공제) */
  npsPaid: number;
  /** 노란우산공제 납입액 */
  yellowUmbrellaPaid: number;
  /** 연금계좌 납입액 (세액공제) */
  pensionAccountPaid: number;
  /** 성실신고확인 대상 여부 */
  sincereApplies: boolean;
  /** 성실신고 확인비용 */
  sincereConfirmCost: number;
  /** 기납부 원천징수세액(국세+지방 합계). null이면 사업수입×3.3% 자동 */
  prepaidWithholding: number | null;
};

export const DEFAULT_COMP_INCOME: CompIncomeInput = {
  revenue: 80_000_000,
  expenses: 20_000_000,
  grossSalary: 0,
  spouse: false,
  dependents: 0,
  elderly: 0,
  disabled: 0,
  femaleHead: false,
  singleParent: false,
  children8Plus: 0,
  npsPaid: 3_000_000,
  yellowUmbrellaPaid: 0,
  pensionAccountPaid: 0,
  sincereApplies: false,
  sincereConfirmCost: 0,
  prepaidWithholding: null,
};

export function normalizeCompIncome(input: Partial<CompIncomeInput>): CompIncomeInput {
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const int = (v: unknown): number => Math.floor(num(v));
  const merged = { ...DEFAULT_COMP_INCOME, ...input };
  return {
    revenue: num(merged.revenue),
    expenses: num(merged.expenses),
    grossSalary: num(merged.grossSalary),
    spouse: Boolean(merged.spouse),
    dependents: int(merged.dependents),
    elderly: int(merged.elderly),
    disabled: int(merged.disabled),
    femaleHead: Boolean(merged.femaleHead),
    singleParent: Boolean(merged.singleParent),
    children8Plus: int(merged.children8Plus),
    npsPaid: num(merged.npsPaid),
    yellowUmbrellaPaid: num(merged.yellowUmbrellaPaid),
    pensionAccountPaid: num(merged.pensionAccountPaid),
    sincereApplies: Boolean(merged.sincereApplies),
    sincereConfirmCost: num(merged.sincereConfirmCost),
    prepaidWithholding: merged.prepaidWithholding === null ? null : num(merged.prepaidWithholding),
  };
}
