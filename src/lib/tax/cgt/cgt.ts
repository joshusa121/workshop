/**
 * 주택 양도소득세 파이프라인 (소득세법 §92 순서):
 * 양도차익 → (12억 초과분 안분) → 장기보유특별공제 → 양도소득금액 → 기본공제 → 과세표준 → 세율 → 산출세액 → 지방소득세.
 * 다주택 중과(§104⑦)는 surcharge.ts 판정(유예 2026-05-09 만료·경과조치, Josh 승인 2026-09-26)대로 반영한다.
 */
import { applyBrackets } from "../progressive";
import { INCOME_TAX_BRACKETS, LOCAL_TAX_RATE } from "../rates";
import { floorTenWon, floorWon } from "../rounding";
import { traced, type Traced } from "../trace";
import { assessExemption, type Exemption } from "./exemption";
import { assessHousingStatus, type HousingStatus } from "./housing-status";
import type { CgtInput } from "./input";
import { ltcgDeduction, ltcgRate, type LtcgTable } from "./ltcg-deduction";
import { DEADLINE_RULE_NOTE, describeSpan, fullYears } from "./period";
import { CGT_BASIC_DEDUCTION, CGT_COMPUTATION_ORDER, CGT_FLAT_RATES, HIGH_VALUE_THRESHOLD } from "./rates-cgt";
import { redevelopmentGains, type RedevelopmentGains } from "./redevelopment";
import { decideSurcharge, type SurchargeDecision } from "./surcharge";

export type CgtResult = {
  status: HousingStatus;
  exemption: Exemption;
  /** 전체 양도차익 = 양도가액 − 취득가액 − 필요경비 (음수 가능) */
  gain: Traced;
  /** 과세 대상 양도차익 (비과세 12억 초과분 안분 후) */
  taxableGain: Traced;
  ltcg: Traced;
  ltcgTable: LtcgTable;
  incomeAmount: Traced;
  basicDeduction: Traced;
  taxBase: Traced;
  tax: Traced;
  rateLabel: string;
  localTax: Traced;
  total: Traced;
  holdYears: number;
  holdLabel: string;
  surcharge: SurchargeDecision;
  /** "n년·n개월 이내" 기한 계산이 판정에 쓰였는가 (이때 notes에 DEADLINE_RULE_NOTE가 붙는다) */
  deadlineRuleUsed: boolean;
  redevelopment?: RedevelopmentGains;
  /** 계산에 쓴 전제 */
  notes: string[];
  /** 입력만으로 확정할 수 없어 Josh 감수가 필요한 항목 */
  unverified: string[];
};

const won = (n: number) => n.toLocaleString("ko-KR");
/** 부동소수 오차 제거 후 곱셈 (42,500,000 × 0.7 = 29,749,999.99… 방지) */
const mul = (a: number, rate: number) => Math.round(a * rate * 10_000) / 10_000;

export function computeCgt(input: CgtInput): CgtResult {
  const s = input.subject;
  const status = assessHousingStatus(input);
  const exemption = assessExemption(input, status);
  const notes: string[] = [];
  const unverified: string[] = [];
  const rd = input.redevelopment;
  const isOriginalRd = !!rd && rd.role === "original" && (s.kind === "right" || (s.kind === "house" && rd.transferAsNewHouse));

  // 보유기간 (세율용, §104②·§95④). 원조합원은 기존주택 취득일부터. 승계조합원 신축주택은 사용승인일 가정.
  let holdFrom = s.acquiredAt;
  if (rd && rd.role === "successor" && rd.transferAsNewHouse && rd.completionDate) {
    holdFrom = rd.completionDate;
    unverified.push("승계조합원(관리처분 후 입주권 매수)이 완공 후 양도하는 신축주택의 보유기간은 사용승인일부터로 가정했습니다 — 세무사 확인이 필요합니다.");
  }
  const holdYears = fullYears(holdFrom, s.transferredAt);
  const holdLabel = describeSpan(holdFrom, s.transferredAt);
  const resideYears = Math.floor(s.residenceMonths / 12);

  // 1) 양도차익
  let gain: Traced;
  let redevelopment: RedevelopmentGains | undefined;
  if (isOriginalRd && rd) {
    redevelopment = redevelopmentGains(input, rd);
    unverified.push(...redevelopment.unverified);
    gain = traced(
      "양도차익 (관리처분 전·후 합계)",
      redevelopment.total,
      [`관리처분 후 ${won(redevelopment.afterApproval.value)} + 관리처분 전 ${won(redevelopment.beforeApproval.value)}`],
      [CGT_COMPUTATION_ORDER.basis, ...redevelopment.afterApproval.basis],
    );
    notes.push("자본적지출은 기존주택분 비용으로, 양도비는 관리처분 후 양도차익에서 뺐습니다.");
  } else {
    const expenses = s.capitalExpenditure + s.transferCost;
    gain = traced(
      "양도차익",
      s.transferPrice - s.acquisitionPrice - expenses,
      [`양도가액 ${won(s.transferPrice)} − 취득가액 ${won(s.acquisitionPrice)} − 필요경비 ${won(expenses)} (자본적지출 ${won(s.capitalExpenditure)} + 양도비 ${won(s.transferCost)})`],
      [CGT_COMPUTATION_ORDER.basis],
    );
  }

  // 2) 과세 양도차익 (12억 초과분)
  const ratio = exemption.exempt ? exemption.taxableRatio : 1;
  const taxableGain = traced(
    exemption.exempt && !exemption.fullyExempt ? "과세 양도차익 (12억 초과분)" : "과세 양도차익",
    exemption.fullyExempt ? 0 : floorWon(mul(Math.max(0, gain.value), ratio)),
    exemption.exempt && !exemption.fullyExempt
      ? [`양도차익 ${won(gain.value)} × (양도가액 − 12억) ÷ 양도가액 = × ${(ratio * 100).toFixed(4)}%`]
      : exemption.fullyExempt
        ? ["전액 비과세"]
        : [gain.value < 0 ? "양도차손 — 과세 양도차익 0" : "비과세 없음 — 양도차익 전액"],
    exemption.exempt ? [HIGH_VALUE_THRESHOLD.basis] : [CGT_COMPUTATION_ORDER.basis],
  );

  // 3) 장기보유특별공제 (중과 대상이면 배제, §95②)
  const surcharge = decideSurcharge(input, status, holdYears);
  let table: LtcgTable = "none";
  if (surcharge.applies) notes.push("다주택 중과 대상이라 장기보유특별공제를 적용하지 않습니다(§95②).");
  else if (!s.registered) notes.push("미등기 양도 — 장기보유특별공제·기본공제 없음, 세율 70%.");
  else if (s.kind === "presale") notes.push("분양권은 장기보유특별공제 대상이 아닙니다.");
  else if (rd && rd.role === "successor" && s.kind === "right") notes.push("승계취득 입주권은 장기보유특별공제 대상이 아닙니다(§95②).");
  else if (s.kind === "right") table = "table1";
  else {
    const t2 = ltcgRate("table2", holdYears, resideYears);
    if (status.treatedAsOneHouse && t2.eligible) table = "table2";
    else if (holdYears >= 3) table = "table1";
  }
  if (table === "table1" && status.treatedAsOneHouse && s.kind === "house" && !surcharge.applies) {
    notes.push(`1세대 1주택이지만 거주 ${resideYears}년(2년 미만)이라 표2 대신 표1을 적용했습니다.`);
  }

  let ltcg: Traced;
  if (redevelopment && table !== "none") {
    const parts = redevelopment.ltcgParts.map((p) =>
      ltcgDeduction(floorWon(mul(p.gain, ratio)), { table, holdYears: p.holdYears, resideYears, label: `장특공제 — ${p.label}` }),
    );
    ltcg = traced(
      "장기보유특별공제",
      parts.reduce((a, p) => a + p.value, 0),
      parts.flatMap((p) => [`${p.label}: ${p.steps.join(" / ")}`]),
      parts[0]?.basis ?? [],
    );
    if (redevelopment.noLtcgGain > 0) notes.push("관리처분 후 양도차익(입주권 상태)에는 장기보유특별공제가 없습니다(§95②).");
  } else {
    ltcg = ltcgDeduction(taxableGain.value, { table, holdYears, resideYears });
  }

  // 4) 양도소득금액 → 기본공제 → 과세표준
  const incomeAmount = traced("양도소득금액", Math.max(0, taxableGain.value - ltcg.value), [`${won(taxableGain.value)} − 장특공제 ${won(ltcg.value)}`], [CGT_COMPUTATION_ORDER.basis]);
  const deductionValue = s.registered && incomeAmount.value > 0 ? Math.min(CGT_BASIC_DEDUCTION.value, incomeAmount.value) : 0;
  const basicDeduction = traced(
    "양도소득 기본공제",
    deductionValue,
    [s.registered ? "연 250만원 (같은 해 다른 양도가 없다고 가정)" : "미등기 양도 — 기본공제 없음"],
    [CGT_BASIC_DEDUCTION.basis],
  );
  const taxBase = traced(
    "양도소득 과세표준",
    floorWon(incomeAmount.value - basicDeduction.value),
    [`양도소득금액 ${won(incomeAmount.value)} − 기본공제 ${won(basicDeduction.value)}`, "1원 미만 버림"],
    [CGT_COMPUTATION_ORDER.basis, CGT_BASIC_DEDUCTION.basis],
  );

  // 5) 세율 후보 → 큰 세액 (§104① 후단)
  const candidates: { label: string; t: Traced }[] = [];
  if (surcharge.applies) {
    const pct = Math.round(surcharge.add * 100);
    const table = {
      value: INCOME_TAX_BRACKETS.value.map((b) => ({ upTo: b.upTo, rate: Math.round((b.rate + surcharge.add) * 100) / 100 })),
      basis: INCOME_TAX_BRACKETS.basis,
    };
    const t = applyBrackets(taxBase.value, table, `중과세율(기본세율 + ${pct}%p) 산출세액`, floorTenWon);
    candidates.push({ label: `기본세율 + ${pct}%p 중과`, t: { ...t, basis: [...t.basis, ...surcharge.basis] } });
  } else {
    const basic = applyBrackets(taxBase.value, INCOME_TAX_BRACKETS, "기본세율(§55①) 산출세액", floorTenWon);
    candidates.push({ label: "기본세율(6~45%)", t: basic });
  }
  const flat = CGT_FLAT_RATES.value;
  const pushFlat = (rate: number, label: string) =>
    candidates.push({
      label,
      t: traced(`${label} 산출세액`, floorTenWon(mul(taxBase.value, rate)), [`${won(taxBase.value)} × ${rate * 100}%`], [CGT_FLAT_RATES.basis]),
    });
  if (!s.registered) pushFlat(flat.unregistered, "미등기 70%");
  else if (s.kind === "presale") pushFlat(holdYears < 1 ? flat.housingUnder1y : flat.presale, holdYears < 1 ? "분양권 1년 미만 70%" : "분양권 60%");
  else if (holdYears < 1) pushFlat(flat.housingUnder1y, "보유 1년 미만 70%");
  else if (holdYears < 2) pushFlat(flat.housing1to2y, "보유 1년 이상 2년 미만 60%");

  if (surcharge.level !== "none") {
    notes.push("중과 제외 주택(양도 당시 기준시가 1억 이하, 장기임대주택, 부득이한 사유 취득 주택 등)은 판정하지 않았습니다 — 해당하면 세무사 확인이 필요합니다.");
  }

  const best = candidates.reduce((a, b) => (b.t.value > a.t.value ? b : a));
  const tax = traced(
    "양도소득 산출세액",
    best.t.value,
    [
      ...(candidates.length > 1 ? [`세율 후보: ${candidates.map((c) => `${c.label} ${won(c.t.value)}원`).join(" / ")} → 큰 세액 선택(§104① 후단)`] : []),
      ...best.t.steps,
    ],
    candidates.flatMap((c) => c.t.basis),
  );
  const localRaw = tax.value * LOCAL_TAX_RATE.value;
  const localTax = traced("지방소득세 (산출세액 × 10%)", floorTenWon(mul(tax.value, LOCAL_TAX_RATE.value)), [`${won(tax.value)} × 10% = ${won(localRaw)}`], [LOCAL_TAX_RATE.basis]);
  const total = traced(
    "합계 (양도소득세 + 지방소득세)",
    tax.value + localTax.value,
    [`양도소득세 ${won(tax.value)} + 지방소득세 ${won(localTax.value)}`],
    [...tax.basis, LOCAL_TAX_RATE.basis],
  );

  if (status.deadlineRuleUsed || surcharge.deadlineRuleUsed) notes.push(DEADLINE_RULE_NOTE);
  notes.push("취득·양도일은 대금청산일 기준으로 입력한 것으로 봅니다(§98).");
  notes.push("보유기간은 취득일을 첫날로 세어, n년째 되는 날의 전날에 n년을 채운 것으로 봅니다(예: 2023-09-02 취득 → 2026-09-01 양도 = 3년).");

  return {
    status,
    exemption,
    gain,
    taxableGain,
    ltcg,
    ltcgTable: table,
    incomeAmount,
    basicDeduction,
    taxBase,
    tax,
    rateLabel: best.label,
    localTax,
    total,
    holdYears,
    holdLabel,
    surcharge,
    deadlineRuleUsed: status.deadlineRuleUsed || surcharge.deadlineRuleUsed,
    redevelopment,
    notes,
    unverified,
  };
}
