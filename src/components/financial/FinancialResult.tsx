"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { FinancialResult as Result } from "@/lib/tax/financial/engine";
import type { FinancialInput } from "@/lib/tax/financial/input";
import { formatWon } from "@/lib/won";

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

const NOT_COVERED = [
  "해외주식·해외 펀드, 금융투자소득세(폐지)",
  "ISA·연금계좌 등 세제혜택 계좌",
  "대주주 판정 자체(비율·시가총액) — 직접 선택 필요",
  "주식 양도 시 필요경비 산정, 대주주 외 장외거래",
];

export function FinancialResult({ input, result: r }: { input: FinancialInput; result: Result }) {
  const hasStock = r.stock.gain.value > 0;

  return (
    <div>
      <div className="border-b border-ink pb-6">
        <p className="text-sm text-muted">금융소득 {formatWon(r.financialIncome)}</p>
        <p className={`mt-2 text-2xl ${r.overThreshold ? "text-accent" : "text-ink"}`}>
          {r.overThreshold ? "금융소득이 2천만원을 넘어 종합과세됩니다" : "금융소득은 분리과세로 종결됩니다"}
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed">
          {r.overThreshold
            ? `비교과세로 계산한 종합소득 결정세액은 ${formatWon(r.determinedTax.value)}이고, 이미 뗀 원천징수세액을 빼면 ${formatWon(Math.abs(r.dueTotal))}을 ${r.dueTotal >= 0 ? "더 냅니다" : "돌려받습니다"}.`
            : "이자·배당 합계가 2천만원 이하라 14% 원천징수로 마무리되고 다음 해 5월에 다시 신고하지 않습니다."}
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl">금융소득 (이자·배당)</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          이자·배당은 14% 원천징수(지방세 포함 15.4%)됩니다. 합계가 2천만원을 넘으면 다른 소득과 합쳐 종합과세하며, 비교과세(§62)로 유리한 쪽을 택합니다.
        </p>
        <div className="mt-4 border-t border-ink">
          <Row label="기납부 원천징수세액(국세)" note="금융소득 × 14%">
            <TraceValue t={r.withholdingFed} />
          </Row>
          <Row label="기납부 개인지방소득세" note="원천징수세액 × 10%">
            {formatWon(r.withholdingLocal)}
          </Row>
          <Row label="종합소득 산출세액" note="비교과세(§62) 적용">
            <TraceValue t={r.calculatedTax} />
          </Row>
          <Row label="배당세액공제" note="그로스업 × 공제 한도">
            <TraceValue t={r.dividendCredit} />
          </Row>
          <Row label="종합소득 결정세액">
            <TraceValue t={r.determinedTax} />
          </Row>
          <Row label="개인지방소득세">
            <TraceValue t={r.localTax} />
          </Row>
          <Row label={r.dueTotal >= 0 ? "추가 납부" : "환급"} strong>
            {formatWon(Math.abs(r.dueTotal))}
          </Row>
        </div>
      </section>

      {hasStock && (
        <section className="mt-12">
          <h2 className="text-xl">주식 양도세</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            대주주가 상장주식을 팔면 양도차익에 세금이 붙습니다. 소액주주여도 중소기업·장외주식이면 과세될 수 있습니다.
          </p>
          <div className="mt-4 border-t border-ink">
            <Row label="양도차익">
              <TraceValue t={r.stock.gain} />
            </Row>
            <Row label="− 기본공제" note="연 250만원">
              − 2,500,000원
            </Row>
            <Row label="양도소득 과세표준">
              <TraceValue t={r.stock.taxBase} />
            </Row>
            <Row label="적용 세율" note={r.stock.rateLabel}>
              {r.stock.rateLabel}
            </Row>
            <Row label="양도소득세">
              <TraceValue t={r.stock.tax} />
            </Row>
            <Row label="개인지방소득세" note="양도소득세 × 10%">
              <TraceValue t={r.stock.localTax} />
            </Row>
            <Row label="합계" strong>
              {formatWon(r.stock.total)}
            </Row>
          </div>
        </section>
      )}

      <section className="mt-12 text-sm leading-relaxed">
        <h2 className="text-xl">전제와 미반영</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          {input.otherIncome > 0 && <li>다른 종합소득이 있어 그 소득의 세액도 위 결정세액에 포함되어 있습니다.</li>}
        </ul>
        <p className="mt-6">이 계산기가 다루지 않는 것</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          {NOT_COVERED.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
