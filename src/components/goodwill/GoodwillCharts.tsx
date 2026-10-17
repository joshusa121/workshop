"use client";

import type { GoodwillInput, GoodwillResult } from "@/lib/tax/goodwill/net-effect";
import { formatMan, formatWon } from "@/lib/won";

const INCOME_LABELS = ["직전 1년", "직전 2년", "직전 3년"];
const WEIGHTS = [3, 2, 1];

function Caption({ children }: { children: React.ReactNode }) {
  return <figcaption className="mt-2 text-xs leading-relaxed text-muted">{children}</figcaption>;
}

/** 최근 3년 순이익 막대 — 최근 해에 더 큰 가중치가 붙는 것을 보여준다 */
function IncomeBars({ input }: { input: GoodwillInput }) {
  const vs = input.netIncomes;
  const maxV = Math.max(0, ...vs);
  const minV = Math.min(0, ...vs);
  const span = Math.max(1, maxV - minV);
  const W = 480;
  const H = 160;
  const pad = { l: 10, r: 10, t: 22, b: 30 };
  const y = (v: number) => pad.t + ((H - pad.t - pad.b) * (maxV - v)) / span;
  const zeroY = y(0);
  const colW = (W - pad.l - pad.r) / 3;
  const barW = colW * 0.42;

  return (
    <figure className="break-inside-avoid">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-paper" role="img" aria-label="최근 3년 순이익 막대">
        <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY} stroke="var(--line)" />
        {vs.map((v, i) => {
          const cx = pad.l + colW * i + colW / 2;
          const yTop = Math.min(y(v), zeroY);
          const h = Math.max(1, Math.abs(zeroY - y(v)));
          const negative = v < 0;
          return (
            <g key={i}>
              <rect
                x={cx - barW / 2}
                y={yTop}
                width={barW}
                height={h}
                fill={negative ? "var(--accent)" : "var(--ink)"}
                opacity={0.86}
              />
              <text x={cx} y={negative ? yTop + h + 14 : yTop - 6} textAnchor="middle" fontSize="11" className="num" fill="var(--ink)">
                {formatMan(v)}
              </text>
              <text x={cx} y={H - 16} textAnchor="middle" fontSize="11" fill="var(--muted)">
                {INCOME_LABELS[i]}
              </text>
              <text x={cx} y={H - 3} textAnchor="middle" fontSize="11" fill="var(--accent)" className="num">
                ×{WEIGHTS[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <Caption>최근 3년 이익에 직전 1년 ×3, 2년 ×2, 3년 ×1의 무게를 붙여 평균냅니다. 음수 해는 아래로 그립니다.</Caption>
    </figure>
  );
}

/** 초과이익 = 가중평균 × 50% − 자기자본 × 10% 를 수평 막대로 보여준다 */
function ExcessBars({ input, result }: { input: GoodwillInput; result: GoodwillResult }) {
  const avg = result.valuation.weightedAvg.value;
  const profitPart = avg * 0.5;
  const equityPart = input.equity * 0.1;
  const excess = result.valuation.excessProfit.value;
  const rows = [
    { label: "가중평균 × 50%", value: profitPart, tone: "var(--ink)" },
    { label: "자기자본 × 10%", value: equityPart, tone: "var(--muted)" },
    { label: "초과이익 (차액)", value: excess, tone: "var(--accent)" },
  ];
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const W = 480;
  const rowH = 44;
  const labelW = 150;
  const H = rows.length * rowH + 12;
  const barMax = W - labelW - 96;
  const x = (v: number) => labelW + (barMax * Math.abs(v)) / maxAbs;

  return (
    <figure className="break-inside-avoid">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-paper" role="img" aria-label="초과이익 구성">
        {rows.map((r, i) => {
          const cy = 6 + i * rowH + rowH / 2;
          return (
            <g key={r.label}>
              <text x={0} y={cy + 4} fontSize="12" fill="var(--ink)">
                {r.label}
              </text>
              <rect x={labelW} y={cy - 9} width={Math.max(1, x(r.value))} height={18} fill={r.tone} opacity={0.88} />
              <text x={labelW + x(r.value) + 6} y={cy + 4} fontSize="11" className="num" fill="var(--ink)">
                {formatMan(r.value)}
              </text>
            </g>
          );
        })}
      </svg>
      <Caption>최근 3년 이익의 절반에서 자기자본의 정상 이익(10%)을 뺀 나머지가 초과이익입니다. 이 값이 영업권의 원천입니다.</Caption>
    </figure>
  );
}

/** 5년 절세 — 해마다 같은 절세액이 쌓여 5년 합계가 되는 모습 */
function FiveYearSaving({ result }: { result: GoodwillResult }) {
  const annual = result.corp.annualSaving.value;
  const years = result.corp.years;
  const maxV = Math.max(1, annual * years);
  const W = 480;
  const H = 180;
  const pad = { l: 10, r: 10, t: 22, b: 30 };
  const colW = (W - pad.l - pad.r) / years;
  const plotH = H - pad.t - pad.b;
  const y = (v: number) => pad.t + plotH * (1 - v / maxV);
  const bars = Array.from({ length: years }, (_, i) => annual * (i + 1));

  return (
    <figure className="break-inside-avoid">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-paper" role="img" aria-label="5년 절세 누적">
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="var(--line)" />
        {Array.from({ length: years }, (_, i) => {
          const cx = pad.l + colW * i + colW / 2;
          const h = plotH * ((i + 1) / years);
          return <rect key={i} x={cx - colW * 0.22} y={H - pad.b - h} width={colW * 0.44} height={Math.max(1, h)} fill="var(--ink)" opacity={0.14} />;
        })}
        <path
          d={bars.map((v, i) => `${i === 0 ? "M" : "L"}${pad.l + colW * i + colW / 2} ${y(v)}`).join(" ")}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
        />
        {bars.map((v, i) => (
          <circle key={i} cx={pad.l + colW * i + colW / 2} cy={y(v)} r={3.5} fill="var(--accent)" />
        ))}
        <text x={W - pad.r} y={y(annual * years) - 8} textAnchor="end" fontSize="11" className="num" fill="var(--accent)">
          {formatMan(annual * years)}
        </text>
        {Array.from({ length: years }, (_, i) => (
          <text key={i} x={pad.l + colW * i + colW / 2} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {i + 1}년
          </text>
        ))}
      </svg>
      <Caption>해마다 같은 상각비를 비용으로 잡아 법인세가 줄어든다고 보고, 그 절세액을 5년 쌓은 값입니다. 빨간 선은 누적입니다.</Caption>
    </figure>
  );
}

export function GoodwillCharts({ input, result }: { input: GoodwillInput; result: GoodwillResult }) {
  return (
    <div className="space-y-10">
      <div>
        <p className="mb-3 text-xs tracking-[0.14em] text-muted">그림 1 · 최근 3년 이익</p>
        <IncomeBars input={input} />
      </div>
      <div>
        <p className="mb-3 text-xs tracking-[0.14em] text-muted">그림 2 · 영업권이 나오는 과정</p>
        <ExcessBars input={input} result={result} />
      </div>
      <div>
        <p className="mb-3 text-xs tracking-[0.14em] text-muted">그림 3 · 법인이 5년에 걸쳐 아끼는 세금</p>
        <FiveYearSaving result={result} />
      </div>
      <p className="text-xs text-muted">
        영업권 평가액은 {formatWon(result.valuation.goodwill.value)}입니다.{" "}
        {result.valuation.goodwill.value > 0
          ? "이 금액이 대표의 기타소득이자 법인의 비용이 됩니다."
          : "초과이익이 없어 평가액이 0입니다."}
      </p>
    </div>
  );
}
