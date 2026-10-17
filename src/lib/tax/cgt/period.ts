/**
 * 날짜("YYYY-MM-DD") 기간 계산.
 * 취득일을 첫날로 포함(초일산입)한다 — "취득일부터 양도일까지"(소득세법 §95④·§104②).
 * 그래서 n년은 n년째 응당일의 전날에 채워진다. 예: 2023-09-02 취득 → 2026-09-01 양도 = 3년.
 * 홈택스 장기보유특별공제 계산기로 확인(2026-09-26, cgt-cross-check.md X5·X6).
 */

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function isValidDate(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDate(s);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addYears(s: string, years: number): string {
  const d = parseDate(s);
  const target = new Date(Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth(), d.getUTCDate()));
  // 2월 29일 → 평년 2월 28일 보정
  if (target.getUTCMonth() !== d.getUTCMonth()) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

export function addMonths(s: string, months: number): string {
  const d = parseDate(s);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
  if (target.getUTCDate() !== d.getUTCDate()) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 채운 연수(초일산입). from > to 면 0 */
export function fullYears(from: string, to: string): number {
  if (from > to) return 0;
  const end = addDays(to, 1);
  let n = 0;
  while (addYears(from, n + 1) <= end) n++;
  return n;
}

/** 채운 개월 수(초일산입) */
export function fullMonths(from: string, to: string): number {
  if (from > to) return 0;
  const end = addDays(to, 1);
  let n = 0;
  while (addMonths(from, n + 1) <= end) n++;
  return n;
}

/**
 * "n년 이내"·"n개월 이내" 기한도 보유기간과 같은 초일산입 — 마지막 날은 응당일의 전날.
 * 기한 초일산입 — Josh 확정 2026-09-26 (세션1 경유, status.md 15:33).
 * 민법 §157 초일불산입(국세기본법 §4)으로 보면 하루 늦어질 수 있어, 기한을 판정에 쓴 결과에는 가벼운 확인 권장 문구를 붙인다.
 */
export const DEADLINE_RULE_NOTE = "기한(○년·○개월 이내)의 마지막 날 계산은 세무사 확인을 권장합니다.";

/** "기준일부터 n년 이내"의 마지막 날(초일산입) = n년째 응당일의 전날 */
export function withinYearsLastDay(from: string, years: number): string {
  return addDays(addYears(from, years), -1);
}

/** "기준일부터 n개월 이내"의 마지막 날(초일산입) */
export function withinMonthsLastDay(from: string, months: number): string {
  return addDays(addMonths(from, months), -1);
}

/** "n년 m개월" 표기 */
export function describeSpan(from: string, to: string): string {
  const months = fullMonths(from, to);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}개월`;
  return m === 0 ? `${y}년` : `${y}년 ${m}개월`;
}

/** 해당 월의 말일 */
export function endOfMonth(s: string): string {
  const d = parseDate(s);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}
