"use client";

import type { CgtResult } from "@/lib/tax/cgt/cgt";
import type { CgtInput } from "@/lib/tax/cgt/input";
import { formatMan, formatWon } from "@/lib/won";

function Caption({ children }: { children: React.ReactNode }) {
  return <figcaption className="mt-2 text-xs leading-relaxed text-muted">{children}</figcaption>;
}

/** 양도차익이 어디로 나뉘는지 — 비과세·공제로 빠지는 몫과 세금 대상 몫 */
function GainSplit({ result: r }: { result: CgtResult }) {
  const exemptPart = Math.max(0, r.gain.value - r.taxableGain.value);
  const segs = [
    { label: "비과세로 빠지는 금액 (12억 이하 등)", value: exemptPart, color: "var(--ok)" },
    { label: "오래 가진 만큼 빼준 금액 (장기보유특별공제)", value: r.ltcg.value, color: "var(--muted)" },
    { label: "1년에 한 번 빼주는 금액 (기본공제)", value: r.basicDeduction.value, color: "var(--warn)" },
    { label: "세금을 매기는 기준 금액 (과세표준)", value: r.taxBase.value, color: "var(--ink)" },
  ].filter((x) => x.value > 0);
  const total = Math.max(1, segs.reduce((a, b) => a + b.value, 0));
  const W = 480;
  const H = 40;
  let x = 0;
  const placed = segs.map((sg) => {
    const w = (sg.value / total) * W;
    const rect = { ...sg, x, w };
    x += w;
    return rect;
  });

  return (
    <figure className="break-inside-avoid">
      <p className="num mb-2 text-sm">
        남긴 돈(양도차익) {formatWon(r.gain.value)}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-paper" role="img" aria-label="양도차익 구성">
        {placed.map((sg) => (
          <rect key={sg.label} x={sg.x} y={8} width={Math.max(0.5, sg.w)} height={24} fill={sg.color} opacity={0.88} />
        ))}
      </svg>
      <ul className="mt-3 grid gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
        {placed.map((sg) => (
          <li key={sg.label} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0" style={{ background: sg.color }} />
            <span className="text-muted">{sg.label}</span>
            <span className="num ml-auto">{formatWon(sg.value)}</span>
          </li>
        ))}
      </ul>
      <Caption>왼쪽부터 비과세·공제로 빠지는 몫, 오른쪽이 실제로 세금이 붙는 몫입니다. 넓이가 곧 금액 비중입니다.</Caption>
    </figure>
  );
}

/** 총 세액 = 양도소득세 + 지방소득세 */
function TaxComposition({ result: r }: { result: CgtResult }) {
  const tax = r.tax.value;
  const local = r.localTax.value;
  const total = Math.max(1, tax + local);
  const W = 480;
  const H = 40;
  const taxW = (tax / total) * W;

  return (
    <figure className="break-inside-avoid">
      <p className="num mb-2 text-sm">낼 세금 합계 {formatWon(r.total.value)}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-paper" role="img" aria-label="세액 구성">
        <rect x={0} y={8} width={Math.max(0.5, taxW)} height={24} fill="var(--ink)" opacity={0.88} />
        <rect x={taxW} y={8} width={Math.max(0.5, W - taxW)} height={24} fill="var(--accent)" opacity={0.88} />
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-xs">
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3" style={{ background: "var(--ink)" }} />
          <span className="text-muted">양도소득세</span>
          <span className="num">{formatWon(tax)}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3" style={{ background: "var(--accent)" }} />
          <span className="text-muted">지방소득세</span>
          <span className="num">{formatWon(local)}</span>
        </li>
      </ul>
      <Caption>적용한 세율은 {r.rateLabel}입니다. 지방소득세는 양도소득세의 10%입니다.</Caption>
    </figure>
  );
}

/** 재건축·재개발: 관리처분 전·후로 나눈 차익 */
function RedevelopmentSplit({ result: r }: { result: CgtResult }) {
  const rd = r.redevelopment;
  if (!rd) return null;
  const rows = [
    { label: "관리처분 전 차익", value: rd.beforeApproval.value },
    { label: "관리처분 후 차익", value: rd.afterApproval.value },
  ];
  const maxV = Math.max(1, ...rows.map((x) => Math.abs(x.value)));
  const W = 480;
  const H = 96;
  const labelW = 130;
  const barMax = W - labelW - 90;

  return (
    <figure className="break-inside-avoid">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-paper" role="img" aria-label="재건축 차익 구성">
        {rows.map((row, i) => {
          const cy = 22 + i * 44;
          const w = (Math.abs(row.value) / maxV) * barMax;
          return (
            <g key={row.label}>
              <text x={0} y={cy + 4} fontSize="12" fill="var(--ink)">
                {row.label}
              </text>
              <rect x={labelW} y={cy - 9} width={Math.max(1, w)} height={18} fill="var(--ink)" opacity={0.85} />
              <text x={labelW + w + 6} y={cy + 4} fontSize="11" className="num" fill="var(--ink)">
                {formatMan(row.value)}
              </text>
            </g>
          );
        })}
      </svg>
      <Caption>재건축·재개발 입주권은 관리처분계획인가일을 기준으로 차익을 둘로 나눠 계산합니다.</Caption>
    </figure>
  );
}

export function CgtCharts({ input, result }: { input: CgtInput; result: CgtResult }) {
  const hasGain = result.gain.value > 0;
  return (
    <div className="space-y-10">
      {hasGain && (
        <div>
          <p className="mb-3 text-xs tracking-[0.14em] text-muted">그림 1 · 양도차익이 나뉘는 모습</p>
          <GainSplit result={result} />
        </div>
      )}
      {result.total.value > 0 && (
        <div>
          <p className="mb-3 text-xs tracking-[0.14em] text-muted">그림 2 · 낼 세금의 구성</p>
          <TaxComposition result={result} />
        </div>
      )}
      {input.redevelopment && (
        <div>
          <p className="mb-3 text-xs tracking-[0.14em] text-muted">그림 3 · 재건축 차익</p>
          <RedevelopmentSplit result={result} />
        </div>
      )}
    </div>
  );
}
