import type { Beneficiary } from "./rates-gi";

export type GiftInheritanceInput = {
  /** 옮길 재산 총액 */
  assets: number;
  /** 증여 대상 */
  beneficiary: Beneficiary;
  /** 상속 시 배우자가 상속받는지 */
  hasSpouse: boolean;
  /** 자녀 수 (상속 인적공제) */
  children: number;
  /** 분할 증여 횟수 (10년 간격, 0이면 분할 없음) */
  tranches: number;
};

export const DEFAULT_GIFT_INHERITANCE: GiftInheritanceInput = {
  assets: 2_000_000_000,
  beneficiary: "child",
  hasSpouse: false,
  children: 1,
  tranches: 0,
};

const BENEFICIARIES: Beneficiary[] = ["spouse", "child", "grandchild"];

export function normalizeGiftInheritance(input: Partial<GiftInheritanceInput>): GiftInheritanceInput {
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const int = (v: unknown): number => Math.floor(num(v));
  const m = { ...DEFAULT_GIFT_INHERITANCE, ...input };
  return {
    assets: num(m.assets),
    beneficiary: BENEFICIARIES.includes(m.beneficiary as Beneficiary) ? (m.beneficiary as Beneficiary) : "child",
    hasSpouse: Boolean(m.hasSpouse),
    children: Math.min(20, int(m.children ?? 1)) || 0,
    tranches: Math.min(10, int(m.tranches)),
  };
}

export const BENEFICIARY_LABEL: Record<Beneficiary, string> = {
  spouse: "배우자",
  child: "자녀",
  grandchild: "손자녀(세대생략)",
};
