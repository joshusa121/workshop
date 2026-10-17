import {
  EMPLOYMENT_INSURANCE,
  LTC_RATE,
  NHIS_EXTRA_INCOME_DEDUCTION,
  NHIS_FINANCIAL_INCOME_FLOOR,
  NHIS_RATE_BY_YEAR,
  NPS_BASE_PERIODS,
  NPS_RATE_BY_YEAR,
  WORKPLACE_ACCIDENT_RATE,
  type NpsBasePeriod,
} from "./rates";
import { floorWon } from "./rounding";
import type { Basis } from "./sources";
import { traced, type Traced } from "./trace";

const YEAR = 2026;

function floorThousand(n: number): number {
  if (n <= 0) return 0;
  return Math.floor(n / 1000) * 1000;
}

function periodForMonth(year: number, month: number): NpsBasePeriod {
  const day = `${year}-${String(month).padStart(2, "0")}-01`;
  const hit = NPS_BASE_PERIODS.value.find((p) => p.from <= day && day <= p.to);
  return hit ?? NPS_BASE_PERIODS.value[NPS_BASE_PERIODS.value.length - 1];
}

function npsMonthlyBase(monthlyPay: number, period: NpsBasePeriod): number {
  const truncated = floorThousand(monthlyPay);
  if (truncated === 0) return 0;
  return Math.min(period.cap, Math.max(period.floor, truncated));
}

export function npsContribution(annualPay: number, share: "full" | "half"): { amount: number; bases: number; steps: string[] } {
  const npsRate = NPS_RATE_BY_YEAR.value[YEAR] ?? 0;
  const { bases, steps } = npsAnnualBases(annualPay);
  const rate = share === "full" ? npsRate : npsRate / 2;
  return { amount: floorWon(bases * rate), bases, steps };
}

function npsAnnualBases(annualPay: number): { bases: number; steps: string[] } {
  const monthly = annualPay / 12;
  let bases = 0;
  const steps: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const p = periodForMonth(YEAR, m);
    const b = npsMonthlyBase(monthly, p);
    bases += b;
    if (m === 1 || m === 7) {
      steps.push(
        `${m}월 기준 하한 ${p.floor.toLocaleString("ko-KR")} / 상한 ${p.cap.toLocaleString("ko-KR")} → 월액 ${b.toLocaleString("ko-KR")}`,
      );
    }
  }
  return { bases, steps };
}

const PROPERTY_ASSUMPTION: Basis = {
  kind: "assumption",
  description: "지역건보 재산점수 환산표 미확보. 재산 미반영 — 실제 부담은 이보다 클 수 있음",
  editable: true,
};

export function employeeInsurance(salary: number): {
  employee: Traced;
  employer: Traced;
  npsEmployee: Traced;
  npsEmployer: Traced;
  nhisEmployee: Traced;
  ltcEmployee: Traced;
} {
  const pay = Math.max(0, salary);
  const { amount: nps, bases, steps } = npsContribution(pay, "half");
  const nhis = floorWon(pay * NHIS_RATE_BY_YEAR.value[YEAR] * 0.5);
  const ltc = floorWon(pay * LTC_RATE.value * 0.5);
  const npsEmployee = traced("국민연금 본인", nps, [...steps, `기준소득월액 합 ${bases.toLocaleString("ko-KR")} × 4.75%`], [NPS_RATE_BY_YEAR.basis, NPS_BASE_PERIODS.basis]);
  const npsEmployer = traced("국민연금 사용자", nps, ["본인과 동일 부담"], [NPS_RATE_BY_YEAR.basis]);
  const nhisEmployee = traced("건강보험 본인", nhis, [`총급여 × 7.19% × 1/2`], [NHIS_RATE_BY_YEAR.basis]);
  const ltcEmployee = traced("장기요양 본인", ltc, [`총급여 × 0.9448% × 1/2`], [LTC_RATE.basis]);
  const employee = traced(
    "직장보험 본인",
    nps + nhis + ltc,
    [`연금 ${nps.toLocaleString("ko-KR")} + 건보 ${nhis.toLocaleString("ko-KR")} + 요양 ${ltc.toLocaleString("ko-KR")}`],
    [NPS_RATE_BY_YEAR.basis, NHIS_RATE_BY_YEAR.basis, LTC_RATE.basis],
  );
  const employer = traced(
    "직장보험 사용자",
    nps + nhis + ltc,
    ["등기 대표 고용·산재 미적용. 사용자 연금·건보·요양만"],
    employee.basis,
  );
  return { employee, employer, npsEmployee, npsEmployer, nhisEmployee, ltcEmployee };
}

/** 지역가입자 건강보험료·장기요양보험료 (소득 기준). 개인사업자 필요경비 반영(R2)에도 사용 */
export function regionalHealthParts(income: number): { nhis: number; ltc: number } {
  const base = Math.max(0, income);
  return {
    nhis: floorWon(base * NHIS_RATE_BY_YEAR.value[YEAR]),
    ltc: floorWon(base * LTC_RATE.value),
  };
}

export function regionalInsurance(income: number, property?: number): Traced {
  const base = Math.max(0, income);
  const { amount: nps, steps } = npsContribution(base, "full");
  const { nhis, ltc } = regionalHealthParts(base);
  const propertyNote =
    property === undefined
      ? "재산 미반영 — 실제 부담은 이보다 클 수 있음"
      : "재산 금액이 있으나 점수 환산표·기본공제 미확보 — 재산보험료 0";
  return traced(
    "지역가입 사회보험",
    nps + nhis + ltc,
    [
      ...steps,
      `국민연금 전액 ${nps.toLocaleString("ko-KR")}`,
      `건강보험 ${nhis.toLocaleString("ko-KR")}`,
      `장기요양 ${ltc.toLocaleString("ko-KR")}`,
      propertyNote,
    ],
    [NPS_RATE_BY_YEAR.basis, NHIS_RATE_BY_YEAR.basis, LTC_RATE.basis, PROPERTY_ASSUMPTION],
  );
}

/**
 * 가족 근무자(별거) 고용보험·산재보험 (R4). 실업급여는 노사 각 0.9%,
 * 고용안정·직업능력개발 0.25%와 산재보험료는 사업주 전액.
 */
export function familyEmploymentInsurance(annualPay: number): { employee: Traced; employer: Traced } {
  const pay = Math.max(0, annualPay);
  const emp = EMPLOYMENT_INSURANCE.value;
  const half = emp.unemploymentRate / 2;
  const worker = floorWon(pay * half);
  const employerUnemployment = floorWon(pay * half);
  const stability = floorWon(pay * emp.stabilityUnder150);
  const accident = floorWon(pay * WORKPLACE_ACCIDENT_RATE.value);
  const employee = traced("고용보험 본인", worker, [`총급여 ${pay.toLocaleString("ko-KR")} × 0.9%`], [EMPLOYMENT_INSURANCE.basis]);
  const employer = traced(
    "고용·산재보험 사용자",
    employerUnemployment + stability + accident,
    [
      `실업급여 0.9% = ${employerUnemployment.toLocaleString("ko-KR")}`,
      `고용안정·직업능력개발 0.25% = ${stability.toLocaleString("ko-KR")}`,
      `산재 ${(WORKPLACE_ACCIDENT_RATE.value * 100).toFixed(2)}% = ${accident.toLocaleString("ko-KR")}`,
    ],
    [EMPLOYMENT_INSURANCE.basis, WORKPLACE_ACCIDENT_RATE.basis],
  );
  return { employee, employer };
}

const EXTRA_INCOME_ASSUMPTION: Basis = {
  kind: "assumption",
  description:
    "보수 외 소득월액보험료 상한 고시 금액 미확보 → 상한 미적용. 소득 반영 2년 시차 무시(당해연도 기준). 보수 외 소득은 배당만(타소득 미포함)",
  editable: true,
};

/**
 * 직장가입자(법인 대표)의 배당에 대한 보수 외 소득월액보험료 (연 합계).
 * 배당 ≤ 1천만 → 0 (규칙 §44① 단서). 초과 시 전액 합산 후 2천만 공제(영 §41④) → 월액 × 7.19% + 장기요양.
 */
export function extraIncomeInsurance(dividend: number): Traced {
  const d = Math.max(0, dividend);
  const floor = NHIS_FINANCIAL_INCOME_FLOOR.value;
  const ded = NHIS_EXTRA_INCOME_DEDUCTION.value;
  const basis = [NHIS_FINANCIAL_INCOME_FLOOR.basis, NHIS_EXTRA_INCOME_DEDUCTION.basis, NHIS_RATE_BY_YEAR.basis, LTC_RATE.basis, EXTRA_INCOME_ASSUMPTION];
  if (d <= floor) {
    return traced("보수 외 소득 건강보험료", 0, [`배당 ${d.toLocaleString("ko-KR")} ≤ 1천만 → 금융소득 미합산`], basis);
  }
  const base = Math.max(0, d - ded);
  const monthly = base / 12;
  const nhis = floorWon(monthly * NHIS_RATE_BY_YEAR.value[YEAR]) * 12;
  const ltc = floorWon(monthly * LTC_RATE.value) * 12;
  return traced(
    "보수 외 소득 건강보험료",
    nhis + ltc,
    [
      `배당 ${d.toLocaleString("ko-KR")} > 1천만 → 전액 합산`,
      `(${d.toLocaleString("ko-KR")} − 2천만) ÷ 12 = 월 ${Math.floor(monthly).toLocaleString("ko-KR")}`,
      `건보 월 ${floorWon(monthly * NHIS_RATE_BY_YEAR.value[YEAR]).toLocaleString("ko-KR")} × 12 = ${nhis.toLocaleString("ko-KR")}`,
      `장기요양 월 ${floorWon(monthly * LTC_RATE.value).toLocaleString("ko-KR")} × 12 = ${ltc.toLocaleString("ko-KR")}`,
      "상한 미적용 (고시 금액 미확보)",
    ],
    basis,
  );
}
