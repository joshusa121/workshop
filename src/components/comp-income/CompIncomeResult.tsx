"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import { FILING_WINDOW } from "@/lib/tax/comp-income/rates-comp";
import type { CompIncomeResult as Result } from "@/lib/tax/comp-income/engine";
import type { CompIncomeInput } from "@/lib/tax/comp-income/input";
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

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl">{title}</h2>
      {lead && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{lead}</p>}
      <div className="mt-4 border-t border-ink">{children}</div>
    </section>
  );
}

const NOT_COVERED = [
  "경비율(단순·기준경비율) 자동 산정 — 실제 필요경비를 입력한 전제",
  "의료비·교육비·보장성보험료 세액공제와 월세·주택자금 등 특별공제",
  "이자·배당·임대·기타소득, 금융소득 종합과세",
  "중간예납, 신고를 늦게 한 경우의 가산세, 세액 감면",
  "출산·입양 세액공제, 성실사업자 표준세액공제(12만원)",
];

export function CompIncomeResult({ input, result: r }: { input: CompIncomeInput; result: Result }) {
  const paying = r.dueTotal > 0;
  const refund = r.dueTotal < 0;
  const head = paying ? "5월에 낼 세금이 있습니다" : refund ? "돌려받을 돈이 있습니다" : "낼 세금도, 돌려받을 돈도 없습니다";
  const tone = paying ? "text-accent" : refund ? "text-ok" : "text-ink";

  return (
    <div>
      <div className="border-b border-ink pb-6">
        <p className="text-sm text-muted">예상 결과 (2026년 귀속)</p>
        <p className={`mt-2 text-2xl ${tone}`}>{head}</p>
        <p className={`num mt-4 text-4xl ${tone}`}>{formatWon(Math.abs(r.dueTotal))}</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed">
          {paying && (
            <>
              국세 {formatWon(r.dueFed)}과 개인지방소득세 {formatWon(r.dueLocal)}을 합친 금액입니다. 확정신고 기한
              {" "}{FILING_WINDOW.value.from}~{FILING_WINDOW.value.to}까지 신고·납부합니다.
            </>
          )}
          {refund && <>이미 원천징수로 낸 세금이 결정세액보다 많아 {formatWon(Math.abs(r.dueTotal))}을 돌려받습니다(예상).</>}
          {!paying && !refund && <>결정세액과 원천징수액이 같아 추가로 낼 세금이 없습니다.</>}
        </p>
      </div>

      <Section
        title="세금 계산"
        lead="수입에서 경비와 공제를 차례로 빼고 세율을 곱한 뒤, 미리 낸 원천징수세액을 뺍니다. 밑줄 친 숫자를 누르면 계산 과정과 근거 조문이 나옵니다."
      >
        <Row label="총수입금액">{formatWon(input.revenue)}</Row>
        <Row label="− 필요경비" note="실제로 쓴 통상적인 비용">
          − {formatWon(input.expenses)}
        </Row>
        <Row label="사업소득금액" note={r.deficiency > 0 ? `경비가 초과하여 결손금 ${formatWon(r.deficiency)}` : undefined}>
          <TraceValue t={r.businessIncome} />
        </Row>
        {input.grossSalary > 0 && (
          <Row label="+ 근로소득금액" note="총급여에서 근로소득공제를 뺀 금액">
            + <TraceValue t={r.salaryIncome} />
          </Row>
        )}
        <Row label="종합소득금액">
          <TraceValue t={r.totalIncome} />
        </Row>
        <Row label="− 종합소득공제" note="기본공제·추가공제·연금보험료·노란우산공제">
          − <TraceValue t={r.deductionTotal} />
        </Row>
        <Row label="과세표준">
          <TraceValue t={r.taxBase} />
        </Row>
        <Row label="산출세액" note="기본세율(6~45%) 누진 적용">
          <TraceValue t={r.calcTax} />
        </Row>
        <Row label="− 세액공제" note="표준·자녀·연금계좌·근로·성실신고">
          − <TraceValue t={r.credits.total} />
        </Row>
        <Row label="국세 (결정세액)">
          <TraceValue t={r.determinedTax} />
        </Row>
        <Row label="개인지방소득세" note="국세 결정세액의 10%">
          <TraceValue t={r.localTax} />
        </Row>
        <Row label="낼 세금 합계" note="결정세액 + 개인지방소득세">
          {formatWon(r.determinedTax.value + r.localTax.value)}
        </Row>
        <Row label="− 기납부 원천징수 (3.3%)" note={r.prepaid.auto ? "사업수입 × 3.3%로 자동 계산(3% 국세 + 0.3% 지방소득세)" : "직접 입력한 금액"}>
          − {formatWon(r.prepaid.total)}
        </Row>
        <Row label={paying ? "낼 세금" : refund ? "돌려받을 돈" : "차액"} strong>
          <span className={tone}>{formatWon(Math.abs(r.dueTotal))}</span>
        </Row>
      </Section>

      <Section title="세액공제 안분">
        <Row label="표준세액공제" note={input.grossSalary > 0 ? "근로소득자 13만원" : "사업소득자 7만원"}>
          <TraceValue t={r.credits.standard} />
        </Row>
        {input.children8Plus > 0 && (
          <Row label="자녀세액공제">
            <TraceValue t={r.credits.child} />
          </Row>
        )}
        {input.pensionAccountPaid > 0 && (
          <Row label="연금계좌세액공제">
            <TraceValue t={r.credits.pension} />
          </Row>
        )}
        {input.grossSalary > 0 && (
          <Row label="근로소득세액공제">
            <TraceValue t={r.credits.earned} />
          </Row>
        )}
        {input.sincereApplies && (
          <Row label="성실신고확인비용 세액공제">
            <TraceValue t={r.credits.sincere} />
          </Row>
        )}
      </Section>

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
        <p className="mt-2 text-muted">위에 해당하면 결과가 달라질 수 있어 세무사 확인이 필요합니다.</p>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
