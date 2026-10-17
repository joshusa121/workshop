"use client";

import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { FamilySuccessionInput } from "@/lib/tax/family-succession/input";
import type { FamilySuccessionResult as Result } from "@/lib/tax/family-succession/engine";
import { AFTERCARE, GIFT_BASIS, GIFT_DECREE_BASIS, INHERITANCE_BASIS, INHERITANCE_DECREE_BASIS } from "@/lib/tax/family-succession/rates";
import { traced, type Traced } from "@/lib/tax/trace";
import { ScalarTrace } from "./ScalarTrace";

const VERDICT = { eligible: "입력한 전제에서 요건 충족", ineligible: "충족하지 못한 요건이 있습니다", review: "확인하지 않은 요건이 있습니다", invalid: "입력값을 확인해 주세요" };
const STATE = { pass: "충족", fail: "미충족", review: "Josh 감수" };
function MoneyRow({ label, t, strong = false }: { label: string; t: Traced; strong?: boolean }) {
  return <div className={`flex items-baseline justify-between gap-4 border-b py-3 ${strong ? "border-ink text-lg" : "border-line text-sm"}`}><span>{label}</span><span className="shrink-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0"><TraceValue t={t} /></span></div>;
}
export function FamilySuccessionResult({ input, result: r }: { input: FamilySuccessionInput; result: Result }) {
  const gift = input.mode === "gift";
  const aftercareBasis = gift ? [GIFT_BASIS, GIFT_DECREE_BASIS] : [INHERITANCE_BASIS, INHERITANCE_DECREE_BASIS];
  return <div className="min-w-0 break-keep text-pretty">
    <header className="border-b border-ink pb-6">
      <p className="text-sm text-muted">{gift ? "살아 있을 때 주식 증여" : "사망으로 가업 상속"}</p>
      <h2 className={`mt-2 text-balance text-2xl ${r.status === "eligible" ? "text-ok" : "text-accent"}`}>{VERDICT[r.status]}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">증빙 확인과 신고 전의 사전 점검입니다. 공제액은 세금이 줄어드는 금액과 다릅니다.</p>
    </header>
    {r.errors.length > 0 ? <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-accent" role="alert">{r.errors.map(e => <li key={e}>{e}</li>)}</ul> : <>
      <section className="mt-7" aria-label="공제·세액 계산">
        <MoneyRow label="확인한 가업 대상 재산" t={r.eligibleValue} />
        <MoneyRow label="경영기간별 한도" t={r.cap} />
        {r.status === "eligible" ? <>
          {gift && <MoneyRow label="특례 적용 과세가액" t={r.potentialBenefit} />}
          <MoneyRow label={gift ? "증여특례 공제액" : "상속공제액 (종합한도 적용 전)"} t={r.appliedDeduction} strong={!gift} />
          {gift && <><MoneyRow label="특례 과세표준 (세율을 곱할 금액)" t={r.giftTaxBase} /><MoneyRow label="특례 부분의 증여세 산출세액" t={r.giftTax} strong /></>}
        </> : <>
          <MoneyRow label={gift ? "요건 충족 가정 시 특례 대상" : "요건 충족 가정 시 공제액"} t={r.potentialBenefit} />
          <p className="mt-3 border-l-2 border-warn pl-3 text-sm leading-relaxed text-warn">위 금액은 가정 계산입니다. 미충족·미확인 요건을 해소하기 전에는 적용할 수 없습니다. {r.status === "review" && "Josh 감수 필요."}</p>
        </>}
        <MoneyRow label="한도를 넘는 재산" t={r.outsideCap} />
        <p className="mt-3 text-xs leading-relaxed text-muted">{gift ? "표시한 세액은 한도 내 특례 부분만 계산한 산출세액입니다. 한도 초과분·사업무관자산의 일반 증여세와 세액공제를 반영한 전체 납부세액은 별도 계산해야 합니다." : "다른 상속재산과 채무·다른 공제를 합친 상속세 전체는 계산하지 않습니다. 상속공제 종합한도에 따라 실제 공제액이 줄어들 수 있습니다."}</p>
      </section>
      <section className="mt-10">
        <h3 className="text-xl">요건별 점검</h3>
        <p className="mt-2 text-xs text-muted">숫자와 판정 근거를 누르면 입력값·법령을 볼 수 있습니다.</p>
        <ul className="mt-4 border-t border-ink">
          {r.checks.map(c => <li key={c.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-line py-3 text-sm">
            <span>{c.label}</span>
            <span className="ml-auto flex items-baseline gap-3"><ScalarTrace t={c.trace} unit={c.unit} /><span className={c.status === "pass" ? "text-ok" : c.status === "fail" ? "text-accent" : "text-warn"}>{STATE[c.status]}</span></span>
          </li>)}
        </ul>
      </section>
    </>}
    <section className="mt-10">
      <h3 className="text-xl">승계 후에도 지켜야 할 일</h3>
      <p className="mt-2 text-xs text-muted">미래의 이행 여부는 판정하지 않습니다. 정당한 사유와 예외는 Josh 감수 필요.</p>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed">{AFTERCARE[input.mode].map(s => <li key={s}>{s}<span className="mt-1 block text-right"><ScalarTrace t={traced("사후관리 근거", 0, [s], aftercareBasis)} unit="확인" /></span></li>)}</ul>
      <p className="mt-3 text-xs text-muted">사후관리 근거: {aftercareBasis.map((b, j) => b.kind === "law" ? <a key={j} href={b.url} className="mr-3 underline" target="_blank" rel="noreferrer">{b.law} {b.article}</a> : null)}</p>
    </section>
    <section className="mt-10 border-t border-ink pt-5">
      <h3 className="text-lg">전제와 미반영</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
        <li>확인일 현재 법령의 단일 기업·단일 승계인 기준입니다. 실제 승계일의 부칙 적용은 Josh 감수 필요.</li>
        <li>업종·기업 규모·독립성과 최대주주·특수관계인 범위, 신청서류·배제 사유는 입력한 확인값에 의존합니다.</li>
        <li>대상 재산은 사업무관자산 등을 제외한 평가액을 직접 입력합니다. 주식 평가·과다보유현금·사택 등 예외는 자동 반영하지 않습니다.</li>
        <li>복수 기업·복수 수증자·누적 증여, 배우자 요건 간주, 기회발전특구 예외, 고용·급여 유지의 실제 판정은 Josh 감수 필요.</li>
        <li>상속공제 종합한도·전체 상속세, 일반 증여세·세액공제·연부연납·납부유예·추징 및 이자상당액은 미반영입니다.</li>
        <li>증여는 부모에게 받는 주식·출자지분을 전제로 합니다. 거주자 요건은 상속은 사망한 분, 증여는 받는 분 기준입니다.</li>
      </ul>
    </section>
    <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
  </div>;
}
