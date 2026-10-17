"use client";

import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { Traced } from "@/lib/tax/trace";
import type { RentalInput } from "@/lib/tax/rental-entity/input";
import { dividendBreakpoint, type RentalResult as Result } from "@/lib/tax/rental-entity/engine";

function Row({ t, label, strong = false }: { t: Traced; label?: string; strong?: boolean }) {
  return <div className={`flex items-baseline justify-between gap-4 border-b py-3 text-sm ${strong ? "border-ink font-medium" : "border-line"}`}>
    <p>{label ?? t.label}</p>
    <div className="shrink-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0"><TraceValue t={t} /></div>
  </div>;
}
export const RENTAL_NOTES = [
  "2026년 귀속 거주자·내국법인, 법인 사업연도는 연초부터 연말까지로 가정합니다. 과세되는 임대수입만 입력하며, 주택 비과세 여부는 판정하지 않습니다.",
  "같은 총수입·인정 경비를 개인과 법인에 적용합니다. 보증금 간주임대료(보증금에 대해 계산하는 임대수입), 감가상각·이자는 별도 검토 후 입력해야 합니다. 세무조정·결손금 통산과 이월은 반영하지 않습니다.",
  "개인 종합과세는 본인 기본공제만 적용한 뒤, 임대가 없을 때보다 늘어난 산출세액을 비교합니다. 표준세액공제 등 세액공제·감면, 부양가족 등 추가 소득공제는 미반영이므로 신고 최종세액이 아닙니다.",
  "주택 분리과세의 등록 특례는 모든 주택이 전 기간 적격인 경우만 선택합니다. 일부 기간·등록/미등록 혼합·의무임대기간 미충족 추징은 미반영 — Josh 감수 필요.",
  "소규모 임대법인의 해당 여부는 사용자가 선택합니다. 지배주주 지분·주업·상시근로자 계산 및 외부감사 예외는 Josh 감수 필요. 지방세는 표준세율이며 조례 가감은 미반영 — Josh 감수 필요.",
  "주주는 거주자 1명이며 국내 일반 배당을 연간 한 번 받는 것으로 가정합니다. 다른 금융소득도 국내 일반 세율로 원천징수된 금액만 입력합니다. 비거주자·국외 금융소득·특례 금융상품은 범위 밖입니다.",
  "금융소득 종합과세의 배당가산·배당세액공제·비교과세는 미반영 — Josh 감수 필요. 다른 이자·배당과 이 법인의 배당 합계가 기준을 넘으면 최종 유불리 판정을 하지 않습니다.",
  "유보금(배당하지 않고 법인에 남긴 돈)은 개인 돈이 아닙니다. 유보금 인출에 따른 미래 세금은 미계산이므로 배당 비율이 다르면 올해의 자금 이동도 다릅니다.",
  "대표 급여·퇴직금·건강보험료 등 사회보험, 법인 설립·회계 유지비, 취득세·재산세·종부세·매각 시 양도세/법인세·부가세는 미반영 — Josh 감수 필요.",
  "조특법 임대주택 감면은 미반영 — Josh 감수 필요. 세액별 연간 단일 납부와 끝수 버림을 가정하며 실제 지급회차·소액부징수는 Josh 감수 필요.",
];

export function RentalResult({ input, result: r }: { input: RentalInput; result: Result }) {
  const point = dividendBreakpoint(r, input.otherFinancial);
  const verdict = !r.comparable ? "최종 세부담은 Josh 감수 필요" : r.difference.value > 0 ? "이 전제에서는 개인의 올해 세금이 적습니다" : r.difference.value < 0 ? "이 전제에서는 법인의 올해 세금이 적습니다" : "이 전제에서는 올해 세금이 같습니다";
  return <div className="min-w-0 break-keep text-pretty">
    <header className="border-b border-ink pb-6">
      <p className="text-xs text-muted">연간 임대 운영 · 세액공제 전 비교</p>
      <h2 className="mt-3 text-balance text-2xl font-medium">{verdict}</h2>
      {!r.comparable && <p role="status" className="mt-4 border border-warn p-3 text-sm leading-relaxed text-warn">금융소득 종합과세 대상입니다. 아래 법인 합계는 법인세와 배당 원천징수액을 더한 것으로, 주주의 최종 세금이 아닙니다. 차액·분기점 판정을 보류합니다.</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div><p className="text-sm text-muted">개인 · {r.personalMode}</p><div className="num mt-2 text-xl sm:text-2xl"><TraceValue t={r.personalTotal} /></div></div>
        <div><p className="text-sm text-muted">법인 + 배당 {r.comparable ? "세금" : "원천징수"}</p><div className="num mt-2 text-xl sm:text-2xl [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0"><TraceValue t={r.corporateTotal} /></div></div>
      </div>
      {r.comparable && <div className="mt-5 text-sm">법인 쪽 세금에서 개인 쪽을 뺀 차액 <TraceValue t={r.difference} />. 양수면 개인 쪽이 적습니다.</div>}
      <p className="mt-4 text-xs leading-relaxed text-muted">밑줄 친 금액을 누르면 계산 과정과 법제처 원문을 볼 수 있습니다. 공제·감면과 유보금의 미래 인출 세금은 반영하지 않았습니다.</p>
    </header>
    <section className="mt-10">
      <h3 className="text-xl">어떤 금액으로 비교했나요</h3>
      <div className="mt-4 border-t border-ink"><Row t={r.revenue} /><Row t={r.expenses} /><Row t={r.profit} strong /></div>
    </section>
    <section className="mt-10">
      <h3 className="text-xl">개인으로 받으면</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">종합과세는 다른 소득과 합쳐 누진세율을 적용합니다. 분리과세는 대상 주택의 임대수입을 따로 계산하는 방식입니다.</p>
      <div className="mt-4 border-t border-ink">
        <Row t={r.base} label="합산해 세금을 매기는 금액 (과세표준)" />
        <Row t={r.comprehensiveNational} /><Row t={r.comprehensiveLocal} />
        {r.separateBase && <><Row t={r.separateBase} /><Row t={r.separateNational!} /><Row t={r.separateLocal!} /></>}
        <Row t={r.personalTotal} label={`선택한 ${r.personalMode} 합계 (공제 전)`} strong />
      </div>
    </section>
    <section className="mt-10">
      <h3 className="text-xl">법인으로 받고 배당하면</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">법인이 먼저 세금을 내고, 남은 이익을 주주에게 나눠 주는 배당에 다시 세금이 붙습니다.</p>
      <div className="mt-4 border-t border-ink">
        <Row t={r.corpNational} /><Row t={r.corpLocal} /><Row t={r.dividend} /><Row t={r.dividendNational} /><Row t={r.dividendLocal} /><Row t={r.corporateTotal} strong />
        <Row t={r.shareholderNet} /><Row t={r.retained} />
      </div>
    </section>
    <section className="mt-10 border-y border-ink py-5">
      <h3 className="text-xl">배당금 분기점</h3>
      <p className="mt-2 text-sm leading-relaxed">현재 임대수입·경비를 고정하고, 배당금만 바꿨을 때의 비교입니다.</p>
      <div className="mt-3 text-sm leading-relaxed">
        {!r.comparable ? "금융소득 종합과세 대상이므로 분기점은 Josh 감수 필요입니다." : point.status === "crossing" ? <div>세전 배당 <TraceValue t={point.amount} />부터 법인 쪽의 올해 세금이 개인 이상이 됩니다. 이보다 적게 배당하면 법인 쪽이 적으며, 일부 금액은 법인 안에 남습니다.</div> : point.status === "personal" ? "배당이 없어도 법인의 올해 세금이 개인 이상입니다. 이 입력에서는 배당을 늘려 법인이 유리해지는 분기점이 없습니다." : "계산 가능한 배당 범위에서는 법인의 올해 세금이 적습니다. 배당가능이익과 금융소득 종합과세 기준 안에서 분기점이 없으며, 그 밖의 배당은 Josh 감수 필요입니다."}
      </div>
    </section>
    <section className="mt-10 text-sm leading-relaxed">
      <h3 className="text-xl">전제와 미반영</h3>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">{RENTAL_NOTES.map(n => <li key={n}>{n}</li>)}</ul>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
    </section>
  </div>;
}
