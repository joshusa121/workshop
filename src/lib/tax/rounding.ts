/** 국세 과세표준 1원 미만 끝수 미계산 (국고금관리법 §47, Josh 2026-09-02 유지) */
export function floorWon(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.trunc(n);
}

/** 산출세액 10원 미만 버림 (Josh 2026-09-02 유지) */
export function floorTenWon(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n / 10) * 10;
}
