import { applyBrackets } from "../progressive";
import { floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import {
  BASIC_DEDUCTION_INHERITANCE,
  CHILD_PERSONAL_DEDUCTION,
  FUNERAL_MIN_DEDUCTION,
  GENERATION_SKIP_RATE,
  GIFT_BASIS,
  GIFT_DEDUCTION,
  GIFT_MINIMUM_TAXABLE,
  INHERITANCE_GIFT_BRACKETS,
  LUMP_SUM_DEDUCTION,
  SPOUSE_INHERITANCE_DEDUCTION,
  type Beneficiary,
} from "./rates-gi";
import { normalizeGiftInheritance, type GiftInheritanceInput } from "./input";

export type GiftTaxResult = {
  deduction: number;
  taxBase: number;
  taxBeforeSurcharge: number;
  surcharge: number;
  tax: number;
};

export type Scenario = {
  key: "inherit" | "giftAll" | "split";
  label: string;
  giftTax: Traced;
  inheritanceTax: Traced;
  total: number;
  detail: string[];
};

export type GiftInheritanceResult = {
  giftAll: Scenario;
  inherit: Scenario;
  split: Scenario;
  recommend: Scenario["key"];
  savedBySplit: number;
  notes: string[];
};

function giftDeductionFor(b: Beneficiary): number {
  const g = GIFT_DEDUCTION.value;
  return b === "spouse" ? g.spouse : g.linealDescendant;
}

export function computeGiftTax(amount: number, beneficiary: Beneficiary, minor = false): GiftTaxResult {
  const deduction = Math.min(amount, giftDeductionFor(beneficiary));
  const taxBase = Math.max(0, floorWon(amount) - deduction);
  if (taxBase < GIFT_MINIMUM_TAXABLE.value) {
    return { deduction, taxBase, taxBeforeSurcharge: 0, surcharge: 0, tax: 0 };
  }
  const before = applyBrackets(taxBase, INHERITANCE_GIFT_BRACKETS, "증여세 산출세액", floorWon).value;
  const skip = beneficiary === "grandchild";
  const ratio = skip ? (minor && amount > 2_000_000_000 ? 0.4 : GENERATION_SKIP_RATE.value) : 0;
  const surcharge = floorWon(before * ratio);
  return { deduction, taxBase, taxBeforeSurcharge: before, surcharge, tax: before + surcharge };
}

export function computeInheritanceTax(
  assets: number,
  hasSpouse: boolean,
  children: number,
): { funeral: number; taxableEstate: number; deduction: number; taxBase: number; tax: number } {
  const gross = floorWon(assets);
  // 장례비용은 증빙이 없어도 최소 500만원을 과세가액에서 뺀다(시행령 §9②1호).
  const funeral = Math.min(gross, FUNERAL_MIN_DEDUCTION.value);
  const taxableEstate = gross - funeral;
  const personal = children * CHILD_PERSONAL_DEDUCTION.value;
  const lump = Math.max(BASIC_DEDUCTION_INHERITANCE.value + personal, LUMP_SUM_DEDUCTION.value);
  const spouse = hasSpouse ? SPOUSE_INHERITANCE_DEDUCTION.value : 0;
  const deduction = Math.min(taxableEstate, lump + spouse);
  const taxBase = Math.max(0, taxableEstate - deduction);
  const tax = taxBase > 0 ? applyBrackets(taxBase, INHERITANCE_GIFT_BRACKETS, "상속세 산출세액", floorWon).value : 0;
  return { funeral, taxableEstate, deduction, taxBase, tax };
}

export function computeGiftInheritance(input: GiftInheritanceInput): GiftInheritanceResult {
  const i = normalizeGiftInheritance(input);
  const notes: string[] = [];

  // A) 전액 상속
  const inhA = computeInheritanceTax(i.assets, i.hasSpouse, i.children);
  const inherit: Scenario = {
    key: "inherit",
    label: "전액 상속(사망 후)",
    giftTax: traced("증여세", 0, ["상속으로 이전 — 증여세 없음"], []),
    inheritanceTax: traced(
      "상속세",
      inhA.tax,
      [`장례비 ${inhA.funeral.toLocaleString("ko-KR")} · 공제 ${inhA.deduction.toLocaleString("ko-KR")} → 과표 ${inhA.taxBase.toLocaleString("ko-KR")}`],
      [FUNERAL_MIN_DEDUCTION.basis],
    ),
    total: inhA.tax,
    detail: [
      `장례비용 ${inhA.funeral.toLocaleString("ko-KR")}원(최소 공제액)`,
      `상속공제 ${inhA.deduction.toLocaleString("ko-KR")}원${i.hasSpouse ? "(일괄+배우자 5억)" : "(일괄 5억)"}`,
    ],
  };

  // B) 전액 증여(지금)
  const giftB = computeGiftTax(i.assets, i.beneficiary);
  const giftAll: Scenario = {
    key: "giftAll",
    label: "전액 지금 증여",
    giftTax: traced(
      "증여세",
      giftB.tax,
      [
        `증여가액 ${i.assets.toLocaleString("ko-KR")} − 공제 ${giftB.deduction.toLocaleString("ko-KR")} = 과표 ${giftB.taxBase.toLocaleString("ko-KR")}`,
        giftB.surcharge > 0 ? `세대생략 할증 ${giftB.surcharge.toLocaleString("ko-KR")}원 포함` : "할증 없음",
      ],
      [GIFT_BASIS, GIFT_DEDUCTION.basis, INHERITANCE_GIFT_BRACKETS.basis],
    ),
    inheritanceTax: traced("상속세", 0, ["미리 다 증여 — 상속재산 없음"], []),
    total: giftB.tax,
    detail: [`증여재산공제 ${giftB.deduction.toLocaleString("ko-KR")}원`],
  };

  // C) 분할 증여(공제한도만 무세로 10년마다) + 잔액 상속
  const perTranche = giftDeductionFor(i.beneficiary);
  const freeGift = Math.min(i.assets, perTranche * i.tranches);
  const remaining = Math.max(0, i.assets - freeGift);
  const inhC = computeInheritanceTax(remaining, i.hasSpouse, i.children);
  const split: Scenario = {
    key: "split",
    label: `분할 증여 ${i.tranches}회 + 잔액 상속`,
    giftTax: traced("증여세", 0, [`매 10년마다 공제한도(${perTranche.toLocaleString("ko-KR")}) 이내 증여 → 증여세 0`], [GIFT_DEDUCTION.basis]),
    inheritanceTax: traced(
      "상속세",
      inhC.tax,
      [`잔액 ${remaining.toLocaleString("ko-KR")} − 장례비 ${inhC.funeral.toLocaleString("ko-KR")} − 공제 ${inhC.deduction.toLocaleString("ko-KR")} → 과표 ${inhC.taxBase.toLocaleString("ko-KR")}`],
      [FUNERAL_MIN_DEDUCTION.basis],
    ),
    total: inhC.tax,
    detail: [`무세 증여 ${freeGift.toLocaleString("ko-KR")}원(공제한도 × ${i.tranches}회), 잔액 ${remaining.toLocaleString("ko-KR")}원 상속`],
  };

  const scen = [inherit, giftAll, split];
  const recommend = scen.reduce((a, b) => (b.total < a.total ? b : a)).key;
  const savedBySplit = inherit.total - split.total;

  notes.push(
    "세율은 상속·증여 공통(§26, 증여는 §56 준용), 배제·한도는 §18·§19④·§20①·§21·§53·§55②·§57 기준입니다.",
    "분할 증여는 10년 간격이 지나야 공제가 다시 생깁니다(§53 수증자별 10년 합산 전제).",
    "배우자 상속공제는 5억원(실제 상속액·법정상속분 한도)으로 단순화했습니다(§19④).",
    "장례비용은 증빙 없이도 인정되는 최소액 500만원만 뺐습니다(시행령 §9②). 실제 장례비가 더 들었으면 1천만원까지, 봉안·자연장지 비용은 별도로 500만원까지 더 뺄 수 있습니다.",
    "10년 이내 사전증여 합산(§13), 부동산 시가·감정평가, 금융재산·동거주택·가업상속 공제, 신고세액공제, 연부연납은 반영하지 않았습니다.",
  );
  if (i.beneficiary === "grandchild") notes.push("손자녀에게 주면 세대생략 할증 30%(미성년·20억 초과 40%)가 붙어 불리할 수 있습니다(§57).");

  return { giftAll, inherit, split, recommend, savedBySplit, notes };
}
