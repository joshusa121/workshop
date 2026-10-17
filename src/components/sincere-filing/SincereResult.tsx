"use client";

import type { ReactNode } from "react";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import { traced } from "@/lib/tax/trace";
import type { SincereInput } from "@/lib/tax/sincere-filing/input";
import type { SincereResult as Result } from "@/lib/tax/sincere-filing/engine";
import { ASSUMPTIONS, BOOK_BASIS, CREDIT_CAP, CREDIT_RATE, DEADLINE_BASIS, GROUP_LABELS, SINCERE_BASIS } from "@/lib/tax/sincere-filing/rates-sincere";
import { SincereNumber } from "./SincereNumber";

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-line py-3 text-sm"><span>{label}</span><span className="ml-auto text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0">{children}</span></div>;
}
export function SincereResult({ input: i, result: r }: { input: SincereInput; result: Result }) {
  const verdict = r.target === null ? "Josh 감수가 필요합니다" : r.target ? "성실신고확인 대상입니다" : "일반 기준상 대상이 아닙니다";
  const userBasis = { kind: "assumption" as const, description: "입력한 업종군·수입·신규 및 배제 여부가 맞다는 전제. 특수상황은 별도 감수", editable: true as const };
  const percent = traced("확인비용 공제율", CREDIT_RATE.value, ["직접 확인비용에 곱하는 법정 비율"], [CREDIT_RATE.basis]);
  const deadline = traced("확정신고 법정 명목일", i.year + 1, [r.deadline ?? "특수상황으로 기한 유보", "대상자가 확인서를 제출하는 경우에만 연장 기한 적용", "공휴일·재난에 따른 연장은 미반영"], [DEADLINE_BASIS]);
  return (
    <div className="break-keep text-pretty">
      <header className="border-b border-ink pb-6">
        <p className="text-sm text-muted">수입금액으로 본 판정</p>
        <h2 className={`mt-2 text-balance text-2xl ${r.target === null ? "text-warn" : r.target ? "text-accent" : "text-ink"}`}>{verdict}</h2>
        <p className="mt-4 text-sm leading-relaxed">성실신고확인은 세무사 등이 장부와 증빙을 확인해 확인서를 제출하는 제도입니다. 밑줄 친 숫자를 누르면 계산 과정과 조문을 볼 수 있습니다.</p>
        {r.target === null && <p role="status" className="mt-4 border-l-2 border-warn pl-3 text-sm text-warn">특수 업종·공동사업 등은 일반 기준만으로 확정할 수 없습니다. 아래 금액은 참고이며 대상 여부·기한·공제 판정은 유보합니다.</p>}
      </header>
      <section className="mt-8">
        <h3 className="text-xl">해당 연도 수입과 기준</h3>
        <div className="mt-4 border-t border-ink">
          <Row label="해당 연도 수입 합계"><TraceValue t={r.currentTotal} /></Row>
          <Row label="여러 업종을 한 기준으로 맞춘 수입"><TraceValue t={r.sincereConverted} /></Row>
          <Row label="수입이 가장 큰 업종군의 기준"><TraceValue t={r.sincereThreshold} /></Row>
          <Row label={r.gap.value > 0 ? "기준까지 모자란 환산 수입" : r.gap.value === 0 ? "기준과의 차이 (같으면 대상)" : "기준을 넘은 환산 수입"}><TraceValue t={{ ...r.gap, value: Math.abs(r.gap.value) }} /></Row>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">겸업은 업종별 수입에 기준금액 비율을 곱해 합산합니다. 실제 매출 합계가 기준보다 작아도 대상이 될 수 있습니다.</p>
      </section>
      <section className="mt-10">
        <h3 className="text-xl">장부 작성 의무는 따로 봅니다</h3>
        <p className="mt-3 text-sm">{r.doubleEntry === null ? "Josh 감수 · 장부 의무 판정 유보" : r.doubleEntry ? "복식부기 의무가 있습니다." : "일반 기준상 간편장부 대상입니다."}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">복식부기는 재산과 손익을 이중으로 기록하는 장부 방식입니다. 성실신고 대상과 달리 직전 연도 수입을 봅니다.</p>
        <div className="mt-4 border-t border-ink">
          <Row label="직전 연도 수입 합계"><TraceValue t={r.previousTotal} /></Row>
          <Row label="직전 연도 주업종 환산 수입"><TraceValue t={r.bookConverted} /></Row>
          <Row label="직전 연도 주업종 기준"><TraceValue t={r.bookThreshold} /></Row>
        </div>
        <p className="mt-3 text-sm text-muted">{i.excludedFromSimple ? "간편장부 배제 대상이라는 입력을 우선 반영했습니다." : i.newBusiness ? "신규사업이라는 입력에 따라 일반 신규사업 예외를 반영했습니다." : "입력한 직전 연도 수입과 일반 업종 기준을 비교했습니다."} <a href={BOOK_BASIS.kind === "law" ? BOOK_BASIS.url : ""} target="_blank" rel="noreferrer" className="underline">근거 조문</a></p>
      </section>
      <section className="mt-10">
        <h3 className="text-xl">신고기한과 확인비용</h3>
        <div className="mt-4 border-t border-ink">
          <Row label="확정신고 법정 명목일">{r.deadline ? <SincereNumber t={deadline}>{r.deadline}</SincereNumber> : "Josh 감수"}</Row>
          <Row label="직접 확인비용 (입력)"><TraceValue t={traced("직접 확인비용", i.confirmationCost, ["확인서 작성에 직접 사용한 비용이라는 입력 전제"], [userBasis, CREDIT_RATE.basis])} /></Row>
          <Row label="확인비용 공제율"><SincereNumber t={percent}>{CREDIT_RATE.value * 100}%</SincereNumber></Row>
          <Row label="개인사업자 공제 한도"><TraceValue t={traced("개인 공제 한도", CREDIT_CAP.value, ["개인 성실신고확인대상사업자의 법정 한도"], [CREDIT_CAP.basis])} /></Row>
          <Row label="공제 계산상 한도"><TraceValue t={r.creditEstimate} /></Row>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{r.creditAvailable ? "확인서를 제출한다는 입력 전제로 계산했습니다. 실제로 세금에서 뺄 수 있는 금액은 사업소득 관련 소득세와 공제 배제 여부를 확인해야 합니다. Josh 감수 필요." : "대상자가 확인서를 제출하는 경우에만 확인비용 공제를 안내합니다. 특수상황은 Josh 감수 후 적용합니다."}</p>
        {r.target === true && !i.submitted && <p className="mt-3 text-sm text-warn">확인서 제출을 선택하지 않아 일반 신고기한으로 표시했습니다. 대상자는 확인서 제출 의무가 있으며, 제출 시 연장되는 기한은 <SincereNumber t={traced("확인서 제출 시 기한", i.year + 1, ["대상자가 확인서를 제출하는 조건"], [DEADLINE_BASIS])}>{i.year + 1}-06-30</SincereNumber>입니다. 미제출 시 불이익은 별도로 확인하세요.</p>}
      </section>
      <section className="mt-10">
        <h3 className="text-xl">입력 내역</h3>
        <div className="mt-4 space-y-4 text-sm">{GROUP_LABELS.map((label, n) => <div key={label}>
          <p>{label}</p>
          <Row label="해당 연도"><TraceValue t={traced("해당 연도 업종군 수입", i.current[n], [label, "같은 업종군 사업장 합산 입력"], [userBasis, SINCERE_BASIS])} /></Row>
          <Row label="직전 연도"><TraceValue t={traced("직전 연도 업종군 수입", i.previous[n], [label, "같은 업종군 사업장 합산 입력"], [userBasis, BOOK_BASIS])} /></Row>
        </div>)}</div>
        <p className="mt-3 text-xs text-muted">신규사업 {i.newBusiness ? "해당" : "아님"} / 간편장부 배제 {i.excludedFromSimple ? "해당" : "아님"} / 확인서 제출 {i.submitted ? "제출 전제" : "미선택"} / 특수상황 {i.needsReview ? "해당" : "없음"}</p>
      </section>
      <section className="mt-10 text-sm leading-relaxed">
        <h3 className="text-xl">전제와 미반영</h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">{ASSUMPTIONS.map(note => <li key={note}>{note}</li>)}</ul>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
