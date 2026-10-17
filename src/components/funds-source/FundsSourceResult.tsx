"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { FundsSourceResult as Result } from "@/lib/tax/funds-source/engine";
import type { FundsSourceInput } from "@/lib/tax/funds-source/input";
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
  "배우자·직계존비속에게 양도한 재산의 증여추정(상증세법 §44)",
  "자금조달계획서 제출 대상 판정(조정대상지역·투기과열지구 고시)",
  "실제 소명 서류 심사, 증여세액 계산, 가산세",
  "현금 증여·적금 해지·임대보증금 등 개별 소명 사정",
];

export function FundsSourceResult({ input, result: r }: { input: FundsSourceInput; result: Result }) {
  const head = r.exempt ? (r.unproven.value === 0 ? "소명이 충분합니다" : "증여추정에서 배제됩니다") : "증여추정 대상입니다";
  const tone = r.exempt ? "text-ok" : "text-accent";

  return (
    <div>
      <div className="border-b border-ink pb-6">
        <p className="text-sm text-muted">자금출처 자기진단</p>
        <p className={`mt-2 text-2xl ${tone}`}>{head}</p>
        <p className="mt-4 num text-4xl">
          {r.exempt ? formatWon(0) : formatWon(r.presumptionTarget)}
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed">
          {r.exempt ? (
            r.unproven.value === 0 ? (
              <>입증한 금액이 취득가액 이상이라 증여추정 대상이 아닙니다.</>
            ) : (
              <>부족한 금액이 배제 기준액({formatWon(r.threshold)})보다 작아 증여추정에서 빠집니다. 다만 소명 자료는 남겨 두세요.</>
            )
          ) : (
            <>
              소명되지 않은 금액 {formatWon(r.unproven.value)}이 배제 기준액 {formatWon(r.threshold)}(취득가액의 20%와 2억원 중 적은 금액)에
              이르러, 이 금액이 증여받은 것으로 추정될 수 있습니다.
            </>
          )}
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl">소명(입증) 내역</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          신고·과세로 확인되는 소득, 상속·수증재산, 재산 처분대가로 마련한 금액을 더합니다(상증세법 시행령 §34①).
        </p>
        <div className="mt-4 border-t border-ink">
          <Row label="① 신고·과세받은 소득금액">
            <TraceValue t={r.provenIncome} />
          </Row>
          <Row label="② 신고·과세받은 상속·수증재산">
            <TraceValue t={r.provenInheritance} />
          </Row>
          <Row label="③ 재산 처분대가·부채부담 금전(취득 사용)">
            <TraceValue t={r.provenDisposal} />
          </Row>
          <Row label="소명 합계" strong>
            <TraceValue t={r.provenTotal} />
          </Row>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl">판정</h2>
        <div className="mt-4 border-t border-ink">
          <Row label="취득재산 가액">{formatWon(input.acquisitionValue)}</Row>
          <Row label="− 소명 합계">− {formatWon(r.provenTotal.value)}</Row>
          <Row label="입증되지 않은 금액(부족액)">
            <TraceValue t={r.unproven} />
          </Row>
          <Row label="배제 기준액" note="취득가액의 20%와 2억원 중 적은 금액">
            {formatWon(r.threshold)}
          </Row>
          <Row label="부족액이 기준액에 미달?" note="미달이면 증여추정 배제">
            {r.unproven.value < r.threshold ? "예 (배제)" : r.smallExclusion ? "예 (소액 배제)" : "아니오"}
          </Row>
          <Row label="증여추정 대상액" strong>
            <span className={tone}>{formatWon(r.presumptionTarget)}</span>
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
        <p className="mt-6">이 진단이 다루지 않는 것</p>
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
