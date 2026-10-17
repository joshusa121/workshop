"use client";

import type { CgtResult } from "@/lib/tax/cgt/cgt";
import type { CgtInput } from "@/lib/tax/cgt/input";
import { isValidDate, parseDate, withinYearsLastDay } from "@/lib/tax/cgt/period";
import { MERGER_SPECIAL_YEARS, SURCHARGE_GRACE, TEMPORARY_TWO_HOUSES } from "@/lib/tax/cgt/rates-cgt";

type Tone = "ink" | "ok" | "accent" | "muted";
type Mark = { date: string; label: string; note?: string; tone: Tone };

const TONE_VAR: Record<Tone, string> = { ink: "var(--ink)", ok: "var(--ok)", accent: "var(--accent)", muted: "var(--muted)" };
const DAY = 86_400_000;

function fmt(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}. ${m}. ${day}.`;
}

/** 판정에 쓰인 날짜를 모아 시간순 표식으로 만든다 */
function collectMarks(input: CgtInput, result: CgtResult): { marks: Mark[]; holdFrom: string } {
  const s = input.subject;
  const rd = input.redevelopment;
  const holdFrom = rd?.role === "successor" && rd.transferAsNewHouse && rd.completionDate && isValidDate(rd.completionDate) ? rd.completionDate : s.acquiredAt;
  const marks: Mark[] = [{ date: holdFrom, label: holdFrom === s.acquiredAt ? "산 날" : "새 아파트 사용승인일(보유 시작)", tone: "ink" }];

  const two = withinYearsLastDay(holdFrom, 2);
  const three = withinYearsLastDay(holdFrom, 3);
  if (two <= s.transferredAt) marks.push({ date: two, label: "보유 2년 채움", note: "비과세 보유 요건, 단기세율 끝", tone: "muted" });
  if (three <= s.transferredAt && s.kind !== "presale") marks.push({ date: three, label: "보유 3년 채움", note: "오래 가진 공제 시작", tone: "muted" });

  input.household.others.forEach((o, i) => {
    if (isValidDate(o.acquiredAt)) marks.push({ date: o.acquiredAt, label: `다른 집 ${i + 1} 산 날`, tone: "muted" });
  });

  const sp = input.household.special;
  const first = input.household.others[0];
  if (sp.type === "temporary" && first && isValidDate(first.acquiredAt)) {
    const end = withinYearsLastDay(first.acquiredAt, TEMPORARY_TWO_HOUSES.value.disposeWithinYears);
    marks.push({
      date: end,
      label: "일시적 2주택 처분 기한",
      note: "다른 집을 산 날부터 3년 이내의 마지막 날",
      tone: s.transferredAt <= end ? "ok" : "accent",
    });
  }
  if ((sp.type === "marriage" || sp.type === "cohabitation") && isValidDate(sp.eventDate)) {
    const what = sp.type === "marriage" ? "혼인" : "세대 합가";
    const end = withinYearsLastDay(sp.eventDate, MERGER_SPECIAL_YEARS.value);
    marks.push({ date: sp.eventDate, label: what, tone: "muted" });
    marks.push({ date: end, label: `${what} 특례 기한`, note: "10년 이내의 마지막 날", tone: s.transferredAt <= end ? "ok" : "accent" });
  }
  if (rd && isValidDate(rd.approvalDate)) marks.push({ date: rd.approvalDate, label: "관리처분계획인가", note: "이 날을 기준으로 양도차익을 나눕니다", tone: "muted" });
  if (rd?.transferAsNewHouse && rd.role === "original" && rd.completionDate && isValidDate(rd.completionDate)) {
    marks.push({ date: rd.completionDate, label: "새 아파트 사용승인", tone: "muted" });
  }
  if (result.surcharge.level !== "none") {
    const g = SURCHARGE_GRACE.value.lastTransferDate;
    marks.push({ date: g, label: "다주택 중과 유예 끝", note: "이 날까지 판 집은 중과하지 않았습니다", tone: "accent" });
  }
  marks.push({
    date: s.transferredAt,
    label: "판 날",
    tone: result.surcharge.applies ? "accent" : result.exemption.fullyExempt ? "ok" : "ink",
  });
  marks.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { marks, holdFrom };
}

export function DateRuler({ input, result }: { input: CgtInput; result: CgtResult }) {
  const { marks, holdFrom } = collectMarks(input, result);
  const t0 = parseDate(marks[0].date).getTime();
  const t1 = parseDate(marks[marks.length - 1].date).getTime();
  const span = Math.max(DAY, t1 - t0);
  const W = 600;
  const padL = 16;
  const padR = 16;
  const x = (d: string) => padL + ((parseDate(d).getTime() - t0) / span) * (W - padL - padR);

  // 표식 번호를 겹치지 않게 층으로 쌓는다 (가까우면 한 층 위로)
  const levelOf: number[] = [];
  const lastX: number[] = [];
  marks.forEach((m, i) => {
    const mx = x(m.date);
    let lv = 0;
    while (lastX[lv] !== undefined && mx - lastX[lv] < 26) lv++;
    lastX[lv] = mx;
    levelOf[i] = lv;
  });
  const levels = Math.max(1, ...levelOf.map((l) => l + 1));
  const rowH = 28;
  const baseY = 24 + levels * rowH;
  const others = input.household.others.filter((o) => isValidDate(o.acquiredAt));
  const othersTop = baseY + 16;
  const yearsY = othersTop + others.length * 14 + 22;
  const H = yearsY + 10;

  const y0 = parseDate(marks[0].date).getUTCFullYear();
  const y1 = parseDate(marks[marks.length - 1].date).getUTCFullYear();
  const step = y1 - y0 > 20 ? 5 : y1 - y0 > 9 ? 2 : 1;
  const ticks: number[] = [];
  for (let y = y0 + 1; y <= y1; y++) if ((y - y0) % step === 0) ticks.push(y);

  const sp = input.household.special;
  const first = others[0];
  const window =
    sp.type === "temporary" && first
      ? { from: first.acquiredAt, to: withinYearsLastDay(first.acquiredAt, TEMPORARY_TWO_HOUSES.value.disposeWithinYears) }
      : null;
  const windowOk = window ? input.subject.transferredAt <= window.to : false;
  const grace = result.surcharge.level !== "none" ? SURCHARGE_GRACE.value.lastTransferDate : null;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[600px]" role="img" aria-label="판정에 쓰인 날짜를 시간 순서로 놓은 자">
        {window && (
          <rect
            x={x(window.from)}
            y={baseY - 11}
            width={Math.max(2, x(window.to) - x(window.from))}
            height={22}
            fill={windowOk ? "var(--ok)" : "var(--accent)"}
            opacity={0.2}
          />
        )}
        {grace && (
          <line x1={x(grace)} x2={x(grace)} y1={12} y2={yearsY - 14} stroke="var(--accent)" strokeDasharray="3 4" />
        )}
        <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="var(--line)" />
        <line x1={x(holdFrom)} x2={x(input.subject.transferredAt)} y1={baseY} y2={baseY} stroke="var(--ink)" strokeWidth={5} />
        {others.map((o, i) => (
          <line
            key={i}
            x1={x(o.acquiredAt)}
            x2={x(input.subject.transferredAt)}
            y1={othersTop + i * 14}
            y2={othersTop + i * 14}
            stroke="var(--muted)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        ))}
        {ticks.map((y) => {
          const tx = x(`${y}-01-01`);
          return (
            <g key={y}>
              <line x1={tx} x2={tx} y1={yearsY - 16} y2={yearsY - 10} stroke="var(--muted)" />
              <text x={tx} y={yearsY + 2} textAnchor="middle" fontSize="11" fill="var(--muted)" className="num">
                {y}
              </text>
            </g>
          );
        })}
        {marks.map((m, i) => {
          const mx = x(m.date);
          const cy = baseY - 22 - levelOf[i] * rowH;
          return (
            <g key={`${m.date}-${m.label}`}>
              <line x1={mx} x2={mx} y1={cy + 11} y2={baseY} stroke={TONE_VAR[m.tone]} />
              <circle cx={mx} cy={cy} r={10} fill="var(--canvas)" stroke={TONE_VAR[m.tone]} strokeWidth={1.5} />
              <text x={mx} y={cy + 4} textAnchor="middle" fontSize="11" fill={TONE_VAR[m.tone]} className="num">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <ol className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {marks.map((m, i) => (
          <li key={`${m.date}-${m.label}`} className="flex gap-3">
            <span
              className="num mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]"
              style={{ borderColor: TONE_VAR[m.tone], color: TONE_VAR[m.tone] }}
            >
              {i + 1}
            </span>
            <span>
              <span className="num">{fmt(m.date)}</span> {m.label}
              {m.note && <span className="block text-xs text-muted">{m.note}</span>}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-3 text-xs leading-relaxed text-muted">
        굵은 선은 이 집을 가진 기간, 점선은 다른 집을 가진 기간입니다.
        {window && (windowOk ? " 옅은 초록 칸은 일시적 2주택 처분 기한이고, 판 날이 그 안에 있습니다." : " 옅은 빨강 칸은 일시적 2주택 처분 기한이고, 판 날이 그 밖에 있습니다.")}
        {grace && " 빨간 점선은 다주택 중과 유예가 끝난 날입니다."}
      </figcaption>
    </figure>
  );
}
