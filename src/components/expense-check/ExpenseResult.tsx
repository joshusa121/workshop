"use client";

import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { ExpenseResult as Result } from "@/lib/tax/expense-check/engine";
import { CATEGORY_LABELS, type ExpenseInput } from "@/lib/tax/expense-check/input";
import { EXPENSE_VERSION } from "@/lib/tax/expense-check/version";
import { CAR, DEPRECIATION_BASIS, ENTERTAINMENT, USER_BASIS } from "@/lib/tax/expense-check/rates";
import { traced, type Traced } from "@/lib/tax/trace";
import { formatWon } from "@/lib/won";

function Row({ t }: { t: Traced }) {
  return <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 text-sm">
    <span>{t.label}</span><span className="shrink-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0"><TraceValue t={t} /></span>
  </div>;
}

function InputFigure({ t, unit }: { t: Traced; unit: string }) {
  return <details className="inline-block">
    <summary className="cursor-pointer list-none border-b border-dashed border-ink">{t.value}{unit}</summary>
    <div className="absolute left-0 z-20 mt-2 w-64 border border-ink bg-paper p-3 text-xs shadow-sm">
      <p>{t.label}</p><p className="mt-2">{t.steps.join(" / ")}</p>
      {t.basis.map((b, n) => <p className="mt-2" key={n}>{b.kind === "assumption" ? b.description : b.kind === "law" ? <a href={b.url} className="underline">{b.law} {b.article}</a> : b.source}</p>)}
    </div>
  </details>;
}

export function ExpenseResult({ input, result: r }: { input: ExpenseInput; result: Result }) {
  const categoryBasis = input.category === "car" ? [CAR.basis] : input.category === "entertainment" ? [ENTERTAINMENT.basis] : input.category === "asset" ? [DEPRECIATION_BASIS] : [];
  const sources = Array.from(new Map([...categoryBasis, ...[r.amount, r.allowed, r.excluded, r.deferred, r.limit, ...r.details]
    .flatMap(t => t?.basis ?? [])].filter(b => b.kind === "law").map(b => [b.url, b])).values());
  const extras = input.category === "entertainment" ? [
    traced("입력한 사업연도 매출액", input.revenue, ["해당 사업연도의 실제 매출액. 연환산하지 않음"], [USER_BASIS]),
    traced("입력한 증빙 부인액", input.proofExcluded, ["연간 총액 중 증빙 요건으로 먼저 제외할 금액"], [USER_BASIS]),
    traced("입력한 적격 문화비", input.culture, ["증빙 부인액과 시장·상품권 지출을 제외한 금액"], [USER_BASIS]),
    traced("입력한 적격 시장·상품권 지출", input.market, ["문화비와 중복 없이 입력한 금액"], [USER_BASIS]),
  ] : input.category === "car" ? [traced("입력한 차량 감가상각비", input.depreciation, ["총비용에 포함된 당기 감가상각비"], [USER_BASIS])]
    : input.category === "asset" && !r.limit ? [traced("입력한 상각범위액", input.taxDepreciation, ["사용자가 검증한 상각범위액"], [USER_BASIS])] : [];

  return <div className="break-keep text-pretty">
    <header className="border-b border-ink pb-6">
      <p className="text-xs text-muted">작업실 · 작성일 {new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date())} · 세율 버전 {EXPENSE_VERSION}</p>
      <p className="mt-4 text-sm text-muted">{input.entity === "corp" ? "법인" : "개인사업자"} · {CATEGORY_LABELS[input.category]}</p>
      <h2 className={`mt-2 text-2xl ${r.verdict === "조건부 처리 가능" ? "text-ok" : "text-warn"}`}>{r.verdict}</h2>
      {r.allowed ? <>
        <p className="mt-5 text-sm text-muted">당기 비용 인정 검토액</p>
        <div className={`num mt-2 ${r.allowed.value >= 1_000_000_000_000 ? "text-xl sm:text-3xl" : "text-3xl sm:text-4xl"} [&_[role=dialog]]:text-xs`}><TraceValue t={r.allowed} /></div>
      </> : <p className="mt-4 text-sm leading-relaxed">이 입력은 자동 계산 범위를 벗어납니다. 아래 확인 사항을 세무사와 검토한 뒤 금액을 확정하세요.</p>}
      <p className="mt-4 text-sm leading-relaxed text-muted">비용으로 인정되면 세금을 매기는 소득에서 빠집니다. 표시 금액은 세금 절감액이 아닙니다.</p>
    </header>

    <section className="mt-8">
      <h3 className="text-lg">금액과 계산 근거</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted">밑줄 친 금액을 누르면 계산 과정과 근거 조문을 볼 수 있습니다.</p>
      <div className="mt-4 border-t border-ink">
        <Row t={r.amount} />
        {extras.map(t => <Row key={t.label} t={t} />)}
        {r.details.map(t => <Row key={t.label} t={t} />)}
        {r.limit && <Row t={r.limit} />}
        {r.excluded && <Row t={r.excluded} />}
        {r.deferred && <Row t={r.deferred} />}
      </div>
      {r.excluded && <p className="mt-3 text-xs leading-relaxed text-muted">당기 미반영액에는 이월 검토액이 포함됩니다. 두 금액을 더하지 않습니다.</p>}
    </section>

    <section className="mt-8 text-sm leading-relaxed">
      <h3 className="text-lg">왜 이 판정인가</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5">{r.reasons.map(s => <li key={s}>{s}</li>)}</ul>
    </section>
    <section className="mt-8 border-l-2 border-warn pl-4 text-sm leading-relaxed">
      <h3 className="font-medium text-warn">Josh 감수</h3>
      <ul className="mt-2 list-disc space-y-2 pl-5">{r.review.map(s => <li key={s}>{s}</li>)}</ul>
    </section>
    <section className="relative mt-8 text-sm leading-relaxed">
      <h3 className="text-lg">전제와 미반영</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>현행 법령을 적용하는 사업연도용입니다. 과거 연도 소급 계산과 향후 개정은 반영하지 않습니다.</li>
        <li>국내 사업자와의 실제 사업 지출을 전제합니다. 부가가치세 공제, 증빙불비 가산세, 소득처분·원천징수 및 세금 절감액은 계산하지 않습니다.</li>
        <li>일반 지출은 부가가치세 포함 건당 금액으로 증빙을 확인합니다. 다른 항목은 부가가치세 처리 후 장부상 비용 금액을 입력하세요.</li>
        <li>업무추진비의 증빙 부인액·문화비·시장 지출은 사용자가 먼저 검토해 분류합니다. 특수관계 매출·특수 법인·중복 특례는 자동 계산하지 않습니다.</li>
        <li>승용차는 일반법인의 연중 자가 보유 차량을 전제합니다. 임차·리스·일부 보험가입·이전 연도 이월액·처분손실은 제외합니다.</li>
        <li>일반 자산의 법정 상각률·내용연수·즉시상각 특례는 산정하지 않습니다. 검증한 상각범위액을 입력받아 계상액과 비교합니다.</li>
        <li>중간 계산의 원 미만은 버립니다. 신고서의 단수 처리 및 이월액 확정은 Josh 감수 필요.</li>
        {input.category === "general" && <li>입력 증빙: {input.evidence === "qualified" ? "적격증빙 있음" : input.evidence === "receipt" ? "간이영수증·거래자료만 있음" : "증빙 없음"}. 사업 관련 지출 {input.businessUse ? "해당" : "비해당"}으로 입력했습니다.</li>}
        {input.category === "entertainment" && <li>사업연도: <InputFigure t={traced("입력한 사업연도 개월 수", input.months, ["역에 따른 개월 수. 한 달 미만은 한 달"], [USER_BASIS, ENTERTAINMENT.basis])} unit="개월" />. {input.sme ? "중소기업" : "일반법인"} 전제입니다.</li>}
        {input.category === "entertainment" && <li>특수관계 매출 {input.relatedRevenue ? "있음" : "없음"}, 축소 한도 법인·정부출자기관 {input.specialCorp ? "해당" : "비해당"}으로 입력했습니다.</li>}
        {input.category === "car" && <li>사업연도: <InputFigure t={traced("입력한 사업연도 개월 수", input.months, ["사용자 입력, 단기 사업연도는 별도 안분 검토"], [USER_BASIS, CAR.basis])} unit="개월" />. 연중 자가 보유 {input.fullYearCar ? "해당" : "비해당"}, 축소 한도 법인 {input.specialCorp ? "해당" : "비해당"}으로 입력했습니다.</li>}
        {input.category === "car" && <li>운행기록 {input.logbook ? <>있음 · 입력 업무사용비율 <InputFigure t={traced("입력한 업무사용비율", input.businessPercent, ["업무용 주행거리 ÷ 총 주행거리 × 100"], [USER_BASIS, CAR.basis])} unit="%" /></> : "없음"}, 전용보험 {input.partialInsurance ? "일부기간 가입" : input.insured ? "충족" : "연중 미가입"}, 번호판 {input.plateCompliant ? "충족 또는 비대상" : "요건 미충족"} 전제입니다.</li>}
      </ul>
    </section>
    {sources.length > 0 && <section className="mt-8 text-xs leading-relaxed">
      <h3 className="text-sm">확인한 법령</h3>
      <ul className="mt-2 space-y-2">{sources.map(b => <li key={b.url}><a href={b.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{b.law} {b.article}</a> · 확인 {b.confirmedAt}</li>)}</ul>
    </section>}
    <div className="hidden print:mt-6 print:block print:text-xs">
      <h3>계산 과정</h3>
      {[r.allowed, r.limit, r.excluded, r.deferred, ...r.details].filter((t): t is Traced => t !== null).map(t =>
        <p key={t.label} className="mt-2">{t.label} {formatWon(t.value)}: {t.steps.join(" / ")}</p>)}
    </div>
    <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
  </div>;
}
