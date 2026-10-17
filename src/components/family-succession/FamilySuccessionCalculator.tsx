"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { formatWon } from "@/lib/won";
import { traced } from "@/lib/tax/trace";
import { DEFAULT_FAMILY_SUCCESSION, SAMPLE_FAMILY_SUCCESSION, inputErrors, type FamilySuccessionInput, type Confirmation } from "@/lib/tax/family-succession/input";
import { computeFamilySuccession } from "@/lib/tax/family-succession/engine";
import { encodeFamilySuccession, decodeFamilySuccession } from "@/lib/tax/family-succession/share";
import { FAMILY_SUCCESSION_RATES_VERSION } from "@/lib/tax/family-succession/version";
import { GIFT_BASIS, GIFT_DECREE_BASIS, INHERITANCE_BASIS, INHERITANCE_DECREE_BASIS, INPUT_BASIS } from "@/lib/tax/family-succession/rates";
import { FamilySuccessionResult } from "./FamilySuccessionResult";
import { ScalarTrace } from "./ScalarTrace";

const CONTROL = "mt-2 w-full border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-2 focus:outline-ink";
export function FamilySuccessionCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => { const s = params.get("s"); return s ? decodeFamilySuccession(s) : null; });
  const [input, setInput] = useState<FamilySuccessionInput>(initial?.ok ? initial.input : DEFAULT_FAMILY_SUCCESSION);
  const [copyStatus, setCopyStatus] = useState("");
  const [step, setStep] = useState(0);
  const [today] = useState(() => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }));
  const valid = inputErrors(input).length === 0;
  const result = computeFamilySuccession(input);
  const share = valid ? encodeFamilySuccession(input) : "";
  const gift = input.mode === "gift";
  function update<K extends keyof FamilySuccessionInput>(key: K, value: FamilySuccessionInput[K]) { setInput(p => ({ ...p, [key]: value })); setCopyStatus(""); }
  useEffect(() => {
    if (!share) return;
    const t = window.setTimeout(() => { const url = new URL(window.location.href); url.searchParams.set("s", share); window.history.replaceState(null, "", url); }, 250);
    return () => window.clearTimeout(t);
  }, [share]);
  async function copy() {
    try { const url = new URL(window.location.href); url.searchParams.set("s", share); await navigator.clipboard.writeText(url.href); setCopyStatus("링크 복사됨"); }
    catch { setCopyStatus("주소창의 링크를 복사해 주세요."); }
  }
  function number(key: keyof FamilySuccessionInput, label: string, unit: string, note: string) {
    const value = input[key] as number;
    const sources = [gift ? GIFT_BASIS : INHERITANCE_BASIS, gift ? GIFT_DECREE_BASIS : INHERITANCE_DECREE_BASIS, INPUT_BASIS];
    const t = traced(label, Number.isFinite(value) ? value : 0, [note], sources);
    return <div className="mt-5" key={key}>
      <label htmlFor={`family-${key}`} className="text-sm">{label} ({unit})</label>
      <input id={`family-${key}`} type="number" aria-describedby={`family-${key}-note`} min="0" step={unit === "원" ? "1" : "any"} value={Number.isFinite(value) ? value : ""} onChange={e => update(key, e.target.value === "" ? 0 : Number(e.target.value))} className={`${CONTROL} num`} />
      <div className="mt-2 flex items-start justify-between gap-4"><p id={`family-${key}-note`} className="text-xs leading-relaxed text-muted">{note}</p><span className="shrink-0"><ScalarTrace t={t} unit={unit === "원" ? "확인" : unit} /></span></div>
      {unit === "원" && <p className="mt-1 text-xs text-muted">{formatWon(value || 0)}</p>}
    </div>;
  }
  function confirmation(key: keyof FamilySuccessionInput, label: string, note: string) {
    return <div className="mt-5" key={key}><label htmlFor={`family-${key}`} className="text-sm">{label}</label><select id={`family-${key}`} value={input[key] as Confirmation} onChange={e => update(key, e.target.value as Confirmation)} className={CONTROL}><option value="unknown">아직 확인하지 못함 · Josh 감수</option><option value="yes">예 · 확인함</option><option value="no">아니오 · 충족하지 않음</option></select><p className="mt-2 text-xs leading-relaxed text-muted">{note}</p></div>;
  }
  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <header>
      <p className="text-xs text-muted">15 / 연재</p><h1 className="mt-3 text-balance text-3xl font-medium">가업승계 공제 판정</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">이어온 사업을 다음 세대에게 넘길 때, 상속공제를 받을지 주식 증여특례를 쓸지 요건부터 점검합니다. 대상 재산과 경영기간을 넣고 아직 확인할 일을 살펴보세요.</p>
      <p className="mt-4 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {FAMILY_SUCCESSION_RATES_VERSION}</p>
    </header>
    {initial && !initial.ok && <p role="alert" className="mt-6 border border-accent p-3 text-sm text-accent">{initial.reason} · {LINK_ERROR_NEXT}</p>}
    {initial?.ok && initial.ratesChanged && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">저장할 때와 세율 버전이 다릅니다. 현재 법령으로 다시 계산했습니다. Josh 감수 필요.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print min-w-0">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm"><button type="button" className="underline underline-offset-4" onClick={() => { setInput(SAMPLE_FAMILY_SUCCESSION); setCopyStatus(""); }}>상속 예시 채우기</button><button type="button" className="underline underline-offset-4" onClick={() => { setInput({ ...SAMPLE_FAMILY_SUCCESSION, mode: "gift" }); setCopyStatus(""); }}>증여 예시 채우기</button><button type="button" className="text-muted underline underline-offset-4" onClick={() => { setInput(DEFAULT_FAMILY_SUCCESSION); setCopyStatus(""); }}>초기화</button></div>
        <nav aria-label="입력 단계" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">{["승계 방식과 기업", "넘기는 분", "받는 분"].map((label, index) => <button type="button" key={label} aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)} className={step === index ? "border-b border-ink" : "text-muted hover:text-ink"}>{label}</button>)}</nav>
        <form className="mt-6" onSubmit={e => e.preventDefault()}>
          <fieldset hidden={step !== 0} className="border-t border-ink pt-4"><legend className="pr-3 text-lg">승계 방식과 기업</legend>
            <label htmlFor="family-mode" className="text-sm">어떻게 넘기나요?</label><select id="family-mode" value={input.mode} onChange={e => update("mode", e.target.value as FamilySuccessionInput["mode"])} className={CONTROL}><option value="inheritance">사망으로 가업 상속</option><option value="gift">살아 있을 때 주식 증여</option></select>
            <label htmlFor="family-form" className="mt-5 block text-sm">사업 형태</label><select id="family-form" value={input.legalForm} onChange={e => update("legalForm", e.target.value as FamilySuccessionInput["legalForm"])} className={CONTROL}><option value="corporation">법인 · 주식 또는 출자지분</option><option value="individual">개인사업 · 사업용 자산</option></select>
            <label htmlFor="family-size" className="mt-5 block text-sm">기업 규모</label><select id="family-size" value={input.companySize} onChange={e => update("companySize", e.target.value as FamilySuccessionInput["companySize"])} className={CONTROL}><option value="sme">중소기업</option><option value="mid">중견기업</option></select>
            {confirmation("enterprise", "법령상 대상 기업·업종인가요?", "시행령 별표 업종, 기업 규모·독립성 등을 별도로 확인해 주세요. 중소기업은 자산총액 5천억원 미만이어야 합니다.")}
            {input.companySize === "mid" && number("averageRevenue", "직전 세 사업연도 평균 매출", "원", "사업연도가 짧으면 연간 환산합니다. 평균 5천억원 미만이어야 합니다.")}
            {number("businessYears", "계속 경영한 기간", "년", "10년부터 대상입니다. 합산 가능한 업종 변경·재편 기간은 별도 확인해 주세요.")}
            {number("eligibleValue", "사업무관자산 등을 제외한 대상 재산", "원", "총 주식가액 그대로가 아닙니다. 법인은 주식가액에 사업무관자산 제외 비율을 곱합니다. 개인 상속은 직접 사용 사업용 자산에서 그 자산의 담보채무를 뺍니다. 평가액은 Josh 감수 필요.")}
          </fieldset>
          <fieldset hidden={step !== 1} className="border-t border-ink pt-4"><legend className="pr-3 text-lg">사업을 넘기는 분</legend>
            {number("ownerAge", gift ? "증여 부모 나이" : "사망 당시 나이", "세", gift ? "증여일 현재 60세 이상인 부모를 전제로 합니다." : "65세 이전 사망이면 상속인의 사전 종사기간 예외가 있습니다.")}
            {confirmation("resident", gift ? "받는 분은 거주자인가요?" : "사망한 분은 거주자였나요?", "거주자는 국내 주소·생활관계 등을 따져 판단합니다. 국적만으로 판단하지 않습니다.")}
            {input.legalForm === "corporation" && <>
              <label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={input.listed} onChange={e => update("listed", e.target.checked)} />상장법인입니다</label>
              {confirmation("largestShareholder", "최대주주·특수관계인 범위를 확인했나요?", "최대주주 해당 여부와 가족 등의 합산 범위를 따로 확인해 주세요.")}
              {number("familySharePercent", "특수관계인 포함 합산 지분", "%", "비상장은 40%, 상장은 20% 이상을 계속 보유해야 합니다.")}
              {number("shareHoldingYears", "위 지분을 계속 보유한 기간", "년", "최소 지분율 이상으로 10년 이상 계속 보유한 기간입니다.")}
            </>}
            {number("ownerRepresentativeYears", "전체 대표 재직기간", "년", "전체 경영기간의 절반 이상이거나 최근 열 해 중 다섯 해 이상 대표 재직이면 충족합니다.")}
            {number("ownerRepresentativeLastTen", "이전 열 해 중 대표 재직기간", "년", "승계일 이전 10년 중 실제 대표였던 기간입니다.")}
            {!gift && confirmation("successorContinuous", "대표 승계 후 계속 재직 경로에 해당하나요?", "위 대표 재직 요건에 못 미쳐도, 경영자가 대표로 10년 이상 재직했고 상속인이 그 직을 승계해 사망 시까지 계속 재직했다면 예외 경로를 검토합니다.")}
          </fieldset>
          <fieldset hidden={step !== 2} className="border-t border-ink pt-4"><legend className="pr-3 text-lg">사업을 받는 분</legend>
            {number("recipientAge", "상속인·수증자 나이", "세", "승계일 현재 18세 이상이어야 합니다.")}
            {!gift && <>{number("recipientWorkYears", "상속 전 직접 가업에 종사한 기간", "년", "경영기간 중 2년 이상 직접 종사해야 합니다. 배우자 간주·부득이한 사유는 별도 확인합니다.")}{confirmation("exceptionalDeath", "부득이한 사망에 따른 종사기간 예외인가요?", "천재지변·인재 등 부득이한 사망 사유에 대한 법령상 예외입니다. Josh 감수 후 선택해 주세요.")}</>}
            {confirmation("appointment", "종사·임원·대표 취임 일정을 충족하나요?", gift ? "수증자 또는 배우자가 증여세 신고기한까지 가업에 종사하고 증여일부터 3년 안에 대표로 취임하는지 확인합니다." : "상속인 또는 배우자가 상속세 신고기한까지 임원, 신고기한부터 2년 안에 대표로 취임하는지 확인합니다.")}
            {!gift && input.companySize === "mid" && <>{number("otherEstate", "해당 상속인의 가업 외 순상속재산", "원", "채무·가업상속재산을 뺀 법정 금액입니다. 상속세의 두 배 초과 시 공제를 받지 못합니다.")}{number("inheritanceTaxWithoutRelief", "공제 없이 해당 상속인이 낼 상속세", "원", "가업상속공제 미적용 상태의 해당 상속인 납부의무액을 별도로 계산해 입력하세요. 전체 유산의 세액과 다릅니다.")}</>}
            {confirmation("compliance", "신청·서류와 별도 배제 사유를 확인했나요?", "기한 내 신청·증빙, 조세포탈·회계부정 형 확정 배제, 다른 최대주주로부터 후속 승계 제한 등을 확인합니다. 증여는 창업자금 특례 중복 배제와 복수 수증자 합산도 별도 검토합니다.")}
          </fieldset>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm">{step > 0 ? <button type="button" onClick={() => setStep(step - 1)} className="text-muted underline underline-offset-4">이전 입력</button> : <span />}{step < 2 && <button type="button" onClick={() => setStep(step + 1)} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas">다음: {step === 0 ? "넘기는 분" : "받는 분"}</button>}</div>
        <div className="mt-8 border-t border-line pt-4 text-sm"><button type="button" disabled={!valid} onClick={copy} className="underline underline-offset-4 disabled:opacity-40">입력값 포함 링크 복사</button><p role="status" className="mt-2 text-xs text-muted">{copyStatus}</p></div>
      </div>
      <div aria-live="polite" className="min-w-0"><FamilySuccessionResult input={input} result={result} />{valid && <a href={`/tools/family-succession/report?s=${share}`} className="no-print mt-8 inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a>}</div>
    </div>
  </main>;
}
