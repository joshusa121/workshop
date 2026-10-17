"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { CgtResult as Result } from "@/lib/tax/cgt/cgt";
import { filingDeadline } from "@/lib/tax/cgt/defaults";
import type { CgtInput } from "@/lib/tax/cgt/input";
import { ltcgRate } from "@/lib/tax/cgt/ltcg-deduction";
import { formatWon } from "@/lib/won";
import { CgtCharts } from "./CgtCharts";
import { DateRuler } from "./DateRuler";

function Row({ label, note, children, strong }: { label: ReactNode; note?: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-6 border-b py-3 text-sm ${strong ? "border-ink" : "border-line"}`}>
      <div>
        <p>{label}</p>
        {note && <p className="mt-0.5 text-xs leading-relaxed text-muted">{note}</p>}
      </div>
      <div className={`shrink-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0 ${strong ? "text-lg" : ""}`}>{children}</div>
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl">{title}</h2>
      {lead && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{lead}</p>}
      <div className="mt-4 border-t border-ink">{children}</div>
    </section>
  );
}

function longDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}년 ${m}월 ${day}일`;
}

function verdictOf(r: Result): { head: string; tone: string } {
  if (r.exemption.fullyExempt) return { head: "비과세입니다", tone: "text-ok" };
  if (r.surcharge.applies) return { head: "다주택 중과 대상입니다", tone: "text-accent" };
  if (r.exemption.exempt) return { head: "12억원을 넘는 부분만 세금을 냅니다", tone: "text-ink" };
  if (r.gain.value <= 0) return { head: "남긴 돈이 없어 세금이 없습니다", tone: "text-ink" };
  return { head: "세금을 냅니다", tone: "text-ink" };
}

const TABLE_NAME = { table1: "일반(표1)", table2: "1세대 1주택(표2)", none: "" } as const;

/** 수정 가능한 세무 전제 중 이 계산기가 다루지 않는 것 (cgt-facts.md §17) */
const NOT_COVERED = [
  "장기임대주택·상생임대주택·농어촌주택·문화재주택 같은 특례",
  "주택과 상가가 섞인 건물, 집에 딸린 땅이 기준 면적을 넘는 경우",
  "조세특례제한법 감면, 비거주자, 부담부증여, 가족에게 받은 집의 이월과세",
  "같은 해에 다른 부동산을 판 경우의 합산과 기본공제 중복",
  "취득가액을 모를 때의 환산취득가액, 신고를 늦게 한 경우의 가산세",
];

export function CgtResult({ input, result: r }: { input: CgtInput; result: Result }) {
  const v = verdictOf(r);
  const deadline = filingDeadline(input.subject.transferredAt);
  const reasons = Array.from(new Set([...r.status.reasons, ...r.exemption.reasons, ...r.surcharge.reasons]));
  const resideYears = Math.floor(input.subject.residenceMonths / 12);
  const rate = r.ltcgTable === "none" ? null : ltcgRate(r.ltcgTable, r.holdYears, resideYears);
  const rd = r.redevelopment;

  return (
    <div>
      <div className="border-b border-ink pb-6">
        <p className="text-sm text-muted">판정</p>
        <p className={`mt-2 text-2xl ${v.tone}`}>{v.head}</p>
        <p className="num mt-4 text-4xl">
          <TraceValue t={r.total} />
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed">
          {r.total.value > 0 ? (
            <>
              양도소득세 {formatWon(r.tax.value)}과 지방소득세 {formatWon(r.localTax.value)}을 합한 금액입니다. 판 달의 말일부터
              2개월 안인 {longDate(deadline)}까지 신고하고 냅니다.
            </>
          ) : (
            <>낼 세금은 없습니다. 다만 비과세라도 신고가 필요한 경우가 있으니 {longDate(deadline)} 전에 세무사와 확인하세요.</>
          )}
        </p>
      </div>

      {r.unverified.length > 0 && (
        <div className="mt-8 border border-warn px-4 py-3 text-sm leading-relaxed text-warn">
          <p>이 결과에는 세무사 확인이 필요한 가정이 들어 있습니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {r.unverified.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="날짜로 본 판정" lead={`보유기간은 ${r.holdLabel}입니다. 양도세는 날짜에서 대부분이 갈립니다.`}>
        <div className="pt-6">
          <DateRuler input={input} result={r} />
        </div>
      </Section>

      <Section title="그림으로 보기" lead="양도차익이 어디로 나뉘고, 세금이 어떻게 구성되는지 그림으로 봅니다.">
        <div className="pt-6">
          <CgtCharts input={input} result={r} />
        </div>
      </Section>

      <Section
        title="세금 계산"
        lead="판 값에서 산 값과 비용을 뺀 금액(양도차익)에서 출발해 차례로 뺀 뒤 세율을 곱합니다. 밑줄 친 숫자를 누르면 계산 과정과 근거 조문이 나옵니다."
      >
        <Row label="판 값">{formatWon(input.subject.transferPrice)}</Row>
        {rd ? (
          <>
            <Row label="관리처분 뒤에 생긴 차익" note="판 값에서 기존 집 평가액과 청산금, 팔 때 비용을 정리한 금액">
              <TraceValue t={rd.afterApproval} />
            </Row>
            <Row label="관리처분 전에 생긴 차익" note="기존 집 평가액에서 산 값을 뺀 금액">
              <TraceValue t={rd.beforeApproval} />
            </Row>
          </>
        ) : (
          <Row label="산 값과 비용" note="산 값 + 집값을 높인 공사비 + 팔 때 든 비용">
            {formatWon(input.subject.acquisitionPrice + input.subject.capitalExpenditure + input.subject.transferCost)}
          </Row>
        )}
        <Row label="남긴 돈 (양도차익)">
          <TraceValue t={r.gain} />
        </Row>
        {r.exemption.exempt && !r.exemption.fullyExempt && (
          <Row label="그중 세금이 붙는 부분" note={`12억원을 넘는 비율 ${(r.exemption.taxableRatio * 100).toFixed(1)}%만큼만 세금을 매깁니다`}>
            <TraceValue t={r.taxableGain} />
          </Row>
        )}
        <Row
          label="오래 가진 만큼 빼주는 금액 (장기보유특별공제)"
          note={
            r.surcharge.applies
              ? "중과 대상이라 빼주지 않습니다"
              : rate && rate.rate > 0
                ? `${TABLE_NAME[r.ltcgTable]} ${Math.round(rate.rate * 1000) / 10}%`
                : "3년 넘게 가져야 받습니다"
          }
        >
          − <TraceValue t={r.ltcg} />
        </Row>
        <Row label="1년에 한 번 빼주는 금액 (기본공제)">
          − <TraceValue t={r.basicDeduction} />
        </Row>
        <Row label="세금을 매기는 기준 금액 (과세표준)">
          <TraceValue t={r.taxBase} />
        </Row>
        <Row label="적용 세율" note={r.rateLabel.includes("중과") ? "기본세율에 중과 가산" : undefined}>
          {r.rateLabel}
        </Row>
        <Row label="양도소득세">
          <TraceValue t={r.tax} />
        </Row>
        <Row label="지방소득세" note="양도소득세의 10%">
          <TraceValue t={r.localTax} />
        </Row>
        <Row label="합계" strong>
          <TraceValue t={r.total} />
        </Row>
      </Section>

      <Section title="왜 이 판정인가">
        <ol className="list-decimal space-y-2 py-4 pl-5 text-sm leading-relaxed">
          {reasons.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ol>
      </Section>

      <section className="mt-12 text-sm leading-relaxed">
        <h2 className="text-xl">전제와 미반영</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          <li>세대 구성(누가 같은 세대인지)은 입력한 대로 봅니다. 따로 사는 자녀·부모의 세대 분리 여부는 세무사 확인이 필요합니다.</li>
        </ul>
        <p className="mt-6">이 계산기가 다루지 않는 것</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          {NOT_COVERED.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="mt-2 text-muted">위에 해당하면 결과가 크게 달라질 수 있어 세무사 확인이 필요합니다.</p>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
