import { describe, expect, it } from "vitest";
import { findCrossings } from "../src/lib/tax/breakeven";

describe("findCrossings", () => {
  it("교차 없음", () => {
    expect(findCrossings(() => 1, 0, 100, 20, 1)).toEqual([]);
  });

  it("교차 1개 (일차)", () => {
    const xs = findCrossings((x) => x - 40, 0, 100, 50, 0.5);
    expect(xs).toHaveLength(1);
    expect(xs[0]).toBeCloseTo(40, 0);
  });

  it("교차 복수 (이차)", () => {
    const xs = findCrossings((x) => (x - 20) * (x - 80), 0, 100, 80, 0.5);
    expect(xs.length).toBeGreaterThanOrEqual(2);
    expect(xs[0]).toBeCloseTo(20, 0);
    expect(xs[xs.length - 1]).toBeCloseTo(80, 0);
  });
});
