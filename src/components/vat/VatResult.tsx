"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { VatResult as Result } from "@/lib/tax/vat/engine";
import type { VatInput } from "@/lib/tax/vat/input";
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
  "신용카드·현금영수증·전자세금계산서 발급 세액공제",
  "영세율·면세 사업, 의제매입세액 공제",
  "둘 이상 업종 겸영, 사업장이 여러 곳인 경우",
  "예정고지 분납, 신고를 늦게 한 가산세, 일반과세 전환 시 재고 매입세액",
];

export function VatResult({ input, result: r }: { input: VatInput; result: Result }) {
  const head =
    r.recommend === "simple" ? "간이과세가 유리합니다" : r.recommend === "general" ? "일반과세가 유리합니다" : "두 방식이 같습니다";
  const tone = r.recommend === "simple" ? "text-ok" : r.recommend === "general" ? "text-accent" : "text-ink";

  return (
    <div>
      <div className="border-b border-ink pb-6">
        <p className="text-sm text-muted">1년 부가가치세 비교 (업종: {r.industryLabel})</p>
        <p className={`mt-2 text-2xl ${tone}`}>{head}</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed">
          {r.recommend !== "same" && (
            <>
              차액은 {formatWon(Math.abs(r.diff))}입니다. 연 매출 공급대가 {formatWon(input.annualRevenue)} 기준이며, 부가가치세
              {r.recommend === "simple" ? " 간이과세" : " 일반과세"}가 {formatWon(Math.abs(r.diff))} 더 적습니다.
            </>
          )}
        </p>
        {!r.simpleEligible && (
          <p className="mt-3 border border-warn px-3 py-2 text-sm text-warn">
            연 매출이 1억 400만원 이상이라 간이과세를 선택할 수 없습니다. 아래 간이 계산은 참고값입니다.
          </p>
        )}
        {r.simpleExempt && (
          <p className="mt-3 border border-line px-3 py-2 text-sm text-muted">
            연 매출이 4,800만원 미만이라 간이과세는 납부의무가 면제됩니다.
          </p>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-xl">일반과세</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          매출세액(공급가액의 10%)에서 매입세액(세금계산서 받은 금액의 10%)을 뺍니다. 부가가치세법 §37.
        </p>
        <div className="mt-4 border-t border-ink">
          <Row label="매출세액" note="매출 공급대가 ÷ 1.1 × 10%">
            <TraceValue t={r.outputTax} />
          </Row>
          <Row label="− 매입세액" note="매입 공급대가 ÷ 1.1 × 10%">
            − <TraceValue t={r.inputTax} />
          </Row>
          <Row label={r.generalTax.value < 0 ? "환급세액" : "납부세액"} strong>
            <TraceValue t={r.generalTax} />
          </Row>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl">간이과세</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          공급대가에 업종별 부가가치율과 10%를 곱하고, 세금계산서 매입액의 0.5%를 뺍니다. 부가가치세법 §63.
        </p>
        <div className="mt-4 border-t border-ink">
          <Row label="공급대가 × 부가가치율 × 10%" note={`${r.industryLabel} 부가가치율 ${(r.valueRate * 100).toFixed(0)}%`}>
            <TraceValue t={r.simpleBase} />
          </Row>
          <Row label="− 세금계산서 매입 세액공제" note="매입 공급대가 × 0.5%">
            − <TraceValue t={r.simpleInputCredit} />
          </Row>
          <Row label={r.simpleExempt ? "납부의무 면제" : "납부세액"} strong>
            <TraceValue t={r.simpleTax} />
          </Row>
        </div>
      </section>

      <section className="mt-12 text-sm leading-relaxed">
        <h2 className="text-xl">전제와 미반영</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
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
