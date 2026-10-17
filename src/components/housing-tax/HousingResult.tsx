"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { DISCLAIMER } from "@/lib/catalog";
import { TraceValue } from "@/components/corp-conversion/TraceValue";
import type { HousingInput } from "@/lib/tax/housing-tax/input";
import type { HousingResult as Result } from "@/lib/tax/housing-tax/engine";
import { TraceRate } from "./TraceRate";

function Row({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return <div className={`flex items-start justify-between gap-4 border-b border-line py-3 text-sm print:break-inside-avoid print:py-2 ${strong ? "font-medium" : ""}`}><span>{label}</span><span className="shrink-0 text-right">{children}</span></div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-10 print:mt-6"><h2 className="border-b border-ink pb-3 text-xl print:break-after-avoid">{title}</h2>{children}</section>;
}
export function HousingResult({ input, result: r }: { input: HousingInput; result: Result }) {
  const c = r.comprehensive;
  return <div className="[&_[role=dialog]]:right-0 [&_[role=dialog]]:left-auto print:[&_[role=dialog]]:hidden">
    <div className="border-b-2 border-ink pb-5">
      <h2 className="text-2xl">살 때 한 번, 가진 동안 매년</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">취득할 때의 가액과 보유세의 공시가격은 서로 다릅니다. 아래 금액은 개인 거주자의 일반주택 단독명의를 기준으로 한 표준 추정치입니다.</p>
    </div>
    <div className="mt-5 border-l-2 border-warn pl-4 text-sm leading-relaxed text-warn">
      <p className="font-medium">실제 고지세액과 차이가 날 수 있습니다.</p>
      <p className="mt-1">재산세 과세표준상한·종부세 세부담상한·지역자원시설세는 미반영입니다. 납부액 확정 전 Josh 감수가 필요합니다.</p>
    </div>
    <table className="mt-6 w-full text-left text-sm">
      <caption className="sr-only">세목별 일회성·연간 세금 요약</caption>
      <thead><tr className="border-b border-ink text-muted"><th scope="col" className="py-3 font-normal">언제</th><th scope="col" className="py-3 font-normal">세목</th><th scope="col" className="py-3 text-right font-normal">표준 추정액</th></tr></thead>
      <tbody>
        <tr className="border-b border-line"><th scope="row" className="py-4 pr-3 font-normal">일회성</th><td className="py-4">취득 관련 세금</td><td className="py-4 text-right"><TraceValue t={r.acquisition.total} /></td></tr>
        <tr className="border-b border-line"><th scope="row" className="py-4 pr-3 font-normal">매년</th><td className="py-4">재산 관련 세금</td><td className="py-4 text-right"><TraceValue t={r.propertyTotal} /></td></tr>
        <tr className="border-b border-line"><th scope="row" className="py-4 pr-3 font-normal">매년</th><td className="py-4">종부 관련 세금</td><td className="py-4 text-right"><TraceValue t={c.total} /></td></tr>
        <tr className="border-b border-ink"><th scope="row" className="py-4 pr-3 font-medium">매년 소계</th><td className="py-4 text-xs text-muted">상한 전·시설세 제외</td><td className="py-4 text-right font-medium"><TraceValue t={r.annual} /></td></tr>
        <tr className="border-b border-line"><th scope="row" className="py-4 pr-3 font-normal">팔 때</th><td colSpan={2} className="py-4 text-right"><Link className="underline underline-offset-4" href="/tools/capital-gains">주택 양도세 별도 계산</Link></td></tr>
      </tbody>
    </table>
    <p className="mt-3 text-xs leading-relaxed text-muted">밑줄 친 금액과 비율을 누르면 계산 과정과 근거 조문이 열립니다. 취득세와 연간 보유세는 과세 시점이 달라 한 금액으로 합산하지 않습니다.</p>
    <Section title="취득할 때">
      <Row label="새로 사는 집의 취득가액"><TraceValue t={r.acquisition.price} /></Row>
      <Row label="취득 직후 세대 주택 수"><TraceRate t={r.acquisition.count} unit="채" /></Row>
      <Row label="새로 사는 집 조정대상지역">{input.regulated ? "해당" : "해당 없음"}</Row>
      <Row label="일시적 2주택 취득세 특례">{input.temporaryTwo ? "요건 충족으로 입력" : "적용 안 함"}</Row>
      <Row label="취득 농특세 서민주택 비과세">{input.ruralExempt ? "요건 충족으로 입력" : "적용 안 함"}</Row>
      <Row label="적용 취득세율"><TraceRate t={r.acquisition.rate} /></Row>
      <Row label="취득세"><TraceValue t={r.acquisition.tax} /></Row>
      <Row label="지방교육세"><TraceValue t={r.acquisition.education} /></Row>
      <Row label="농어촌특별세"><TraceValue t={r.acquisition.rural} /></Row>
      <Row label="일회성 소계" strong><TraceValue t={r.acquisition.total} /></Row>
      <p className="mt-3 text-xs leading-relaxed text-muted">유상거래만 다룹니다. 생애최초 등 감면, 저가주택 등 중과 제외, 고급주택, 법인·상속·증여·지분취득은 별도 검토하세요. 취득가액을 비워 두면 공유·보고서가 생성되지 않으며, 취득 검토가 없으면 금액을 영으로 입력하세요.</p>
    </Section>
    <Section title="가진 동안: 재산세">
      <p className="mt-3 text-sm leading-relaxed text-muted">과세기준일에 본인이 가진 집을 각각 계산합니다. 도시지역분은 고시 대상 여부에 따라 붙고, 지방교육세는 재산세 본세에만 붙습니다.</p>
      {r.properties.length === 0 && <p className="mt-4 text-sm text-muted">기준일 보유주택이 없는 것으로 입력했습니다.</p>}
      {r.properties.map((p, i) => <div key={i} className="mt-5 border-l border-line pl-4">
        <h3 className="text-base">보유주택 {i + 1}</h3>
        <Row label="공시가격"><TraceValue t={p.publicValue} /></Row>
        <Row label="공정시장가액비율"><TraceRate t={p.ratio} /></Row>
        <Row label="과세표준 (세금을 매기는 금액)"><TraceValue t={p.base} /></Row>
        <Row label="재산세 본세"><TraceValue t={p.tax} /></Row>
        <Row label="도시지역분"><TraceValue t={p.urban} /></Row>
        <Row label="지방교육세"><TraceValue t={p.education} /></Row>
        <Row label="이 집의 연간 소계" strong><TraceValue t={p.total} /></Row>
      </div>)}
      <Row label="재산 관련 세금 합계" strong><TraceValue t={r.propertyTotal} /></Row>
    </Section>
    <Section title="가진 동안: 종합부동산세">
      <p className="mt-3 text-sm leading-relaxed text-muted">본인 명의 주택의 공시가격을 합산하고 공제한 뒤 세율을 적용합니다. 세대 합산 세금이 아닙니다. 고령자·장기보유 공제는 단순한 1세대 1주택 요건을 충족할 때만 적용합니다.</p>
      <Row label="본인 공시가격 합계"><TraceValue t={c.publicSum} /></Row>
      <Row label="기본공제"><TraceValue t={c.deduction} /></Row>
      <Row label="공정시장가액비율"><TraceRate t={c.ratio} /></Row>
      <Row label="과세표준"><TraceValue t={c.base} /></Row>
      <Row label="공제 전 산출세액"><TraceValue t={c.gross} /></Row>
      <Row label="차감: 재산세 중복분"><TraceValue t={c.propertyCredit} /></Row>
      <Row label="과세기준일 만 나이"><TraceRate t={c.age} unit="세" /></Row>
      <Row label="과세기준일 보유연수"><TraceRate t={c.holdingYears} unit="년" /></Row>
      <Row label="고령자 공제율"><TraceRate t={c.ageRate} /></Row>
      <Row label="장기보유 공제율"><TraceRate t={c.holdRate} /></Row>
      <Row label="한도를 반영한 합산 공제율"><TraceRate t={c.creditRate} /></Row>
      <Row label="차감: 고령·장기보유 세액공제"><TraceValue t={c.personalCredit} /></Row>
      <Row label="종합부동산세 (상한 전)"><TraceValue t={c.tax} /></Row>
      <Row label="농어촌특별세"><TraceValue t={c.rural} /></Row>
      <Row label="종부 관련 세금 합계" strong><TraceValue t={c.total} /></Row>
    </Section>
    <section className="mt-10 text-sm leading-relaxed">
      <h2 className="text-xl">전제와 미반영</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
        <li>취득은 확인일 현재 법령으로 새로 사는 경우를, 보유세는 올해 과세기준일 보유 현황을 각각 입력합니다. 과거 취득세를 소급 계산하는 도구가 아닙니다.</li>
        <li>{input.householdSingle ? "거주자인 본인만 세대 내 유일한 주택을 단독명의로 보유한다고 입력했습니다." : "단순 1세대 1주택에 해당하지 않는 것으로 입력했습니다. 일반 재산세율과 개인별 종부세 기본공제를 사용합니다."}</li>
        <li>재산세 과세표준상한, 종부세 세부담상한, 조례의 세율 가감·감면, 지역자원시설세, 분납·공제 신청·가산세는 미반영입니다.</li>
        <li>합산배제 임대주택, 일시적 다주택·상속·지방 저가주택 등 보유세 특례, 부부 공동명의 특례, 세대분리 판정은 미반영입니다.</li>
        <li>주택 전체를 한 사람이 소유하는 일반주택만 다룹니다. 공동명의·지분·주택과 상가가 섞인 건물·토지만 소유·법인·비거주자는 별도 검토하세요.</li>
        {r.review.map(s => <li key={s}>{s}</li>)}
      </ul>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
    </section>
  </div>;
}
