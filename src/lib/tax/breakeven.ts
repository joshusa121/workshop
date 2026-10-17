/** f = (이익) => 법인우위금액. 부호 변화 구간을 전수 스캔 후 구간 내 이분 정밀화.
 *  차이함수는 보험 상하한·누진구간·배당 전환점 때문에 비단조 — 교차점 0·1·복수 모두 가능 */
export function findCrossings(
  f: (x: number) => number,
  min: number,
  max: number,
  samples = 400,
  tol = 10_000,
): number[] {
  const xs = Array.from({ length: samples + 1 }, (_, i) => min + ((max - min) * i) / samples);
  const crossings: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const [a, b] = [xs[i], xs[i + 1]];
    const [fa, fb] = [f(a), f(b)];
    if (fa === 0) crossings.push(a);
    if (fa * fb < 0) {
      let [lo, hi] = [a, b];
      while (hi - lo > tol) {
        const mid = (lo + hi) / 2;
        if (f(lo) * f(mid) <= 0) hi = mid;
        else lo = mid;
      }
      crossings.push((lo + hi) / 2);
    }
  }
  return crossings;
}
