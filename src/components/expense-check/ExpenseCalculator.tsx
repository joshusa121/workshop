"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { computeExpense } from "@/lib/tax/expense-check/engine";
import { CATEGORY_LABELS, DEFAULT_INPUT, validateInput, type ExpenseInput, type Category } from "@/lib/tax/expense-check/input";
import { decodeExpense, encodeExpense } from "@/lib/tax/expense-check/share";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { ExpenseResult } from "./ExpenseResult";

const fieldClass = "mt-1.5 block w-full border border-line bg-paper px-3 py-2 text-ink focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
type NumberKey = { [K in keyof ExpenseInput]: ExpenseInput[K] extends number ? K : never }[keyof ExpenseInput];
type BoolKey = { [K in keyof ExpenseInput]: ExpenseInput[K] extends boolean ? K : never }[keyof ExpenseInput];

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return <div className="mt-5"><label className="block text-sm">{label}{children}</label>{help && <p className="mt-1.5 text-xs leading-relaxed text-muted">{help}</p>}</div>;
}

export function ExpenseCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => params.has("s") ? decodeExpense(params.get("s") ?? "") : null);
  const [input, setInput] = useState<ExpenseInput>(initial?.ok ? initial.input : DEFAULT_INPUT);
  const [message, setMessage] = useState("");
  const errors = validateInput(input);
  const encoded = errors.length ? null : encodeExpense(input);
  const result = errors.length ? null : computeExpense(input);
  const unsupported = input.entity === "individual" && input.category !== "general";

  useEffect(() => {
    const next = new URL(window.location.href);
    if (encoded) next.searchParams.set("s", encoded); else next.searchParams.delete("s");
    window.history.replaceState(null, "", next);
  }, [encoded]);

  function update<K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) {
    setInput(i => ({ ...i, [key]: value })); setMessage("");
  }
  function number(key: NumberKey, label: string, help?: string, max = 100_000_000_000_000) {
    return <Field label={label} help={help}><input type="number" min={key === "months" ? 1 : 0} max={max} step={key === "businessPercent" ? "0.01" : "1"}
      className={fieldClass} value={Number.isFinite(input[key]) ? input[key] : ""}
      onChange={e => update(key, e.target.value === "" ? NaN : Number(e.target.value))} /></Field>;
  }
  function check(key: BoolKey, label: string, help?: string) {
    return <div className="mt-4"><label className="flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" className="mt-1 accent-[var(--ink)]" checked={input[key]} onChange={e => update(key, e.target.checked)} />{label}</label>{help && <p className="mt-1 pl-6 text-xs leading-relaxed text-muted">{help}</p>}</div>;
  }
  async function copy() {
    if (!encoded) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/tools/expense-check?s=${encoded}`); setMessage("입력값을 포함한 링크를 복사했습니다."); }
    catch { setMessage("복사하지 못했습니다. 주소창의 URL을 복사해 주세요."); }
  }

  return <main className="mx-auto max-w-5xl break-keep px-5 py-12 text-pretty">
    <p className="text-xs text-muted">17 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">이 지출, 경비로 처리할 수 있을까</h1>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">영수증이 있어도 비용이 되지 않는 지출이 있습니다. 사업 관련성, 증빙, 항목별 한도를 나눠 살펴보고 세무사에게 확인할 내용을 정리합니다.</p>
    {initial && !initial.ok && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">{initial.reason} · {LINK_ERROR_NEXT}</p>}
    {initial?.ok && initial.ratesChanged && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">공유 당시와 세율 버전이 다릅니다. 현행 기준으로 다시 계산했습니다.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <h2 className="border-t border-ink pt-4 text-lg">지출 정보</h2>
        <form onSubmit={e => e.preventDefault()}>
          <Field label="사업자 구분"><select className={fieldClass} value={input.entity} onChange={e => update("entity", e.target.value as ExpenseInput["entity"])}><option value="corp">법인</option><option value="individual">개인사업자</option></select></Field>
          <Field label="검토할 항목"><select className={fieldClass} value={input.category} onChange={e => update("category", e.target.value as Category)}>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          {number("amount", input.category === "asset" ? "장부 계상 당기 감가상각비 (원)" : input.category === "entertainment" ? "연간 기업업무추진비 총액 (원)" : input.category === "car" ? "차량 한 대의 연간 총비용 (원)" : "건당 지출금액 · 부가세 포함 (원)",
            input.category === "car" ? "감가상각비와 유지비를 합한 금액입니다. 자가 보유 차량만 입력하세요." : undefined)}
          {check("businessUse", "사업과 관련된 실제 지출입니다")}
          {input.category === "general" && <Field label="보관한 증빙" help="적격증빙은 세금계산서·계산서·신용카드 전표·현금영수증입니다. 단순 계좌이체 내역만으로 적격증빙이 되지는 않습니다."><select className={fieldClass} value={input.evidence} onChange={e => update("evidence", e.target.value as ExpenseInput["evidence"])}><option value="qualified">적격증빙 있음</option><option value="receipt">간이영수증·거래자료만 있음</option><option value="none">증빙 없음</option></select></Field>}
          {unsupported && <p className="mt-5 border-l-2 border-warn pl-3 text-sm leading-relaxed text-warn">이 항목은 법인 엔진입니다. 개인사업자는 Josh 감수 후 별도 기준을 적용합니다.</p>}
          {!unsupported && input.category === "entertainment" && <>
            {number("months", "사업연도 개월 수", "역에 따라 계산하며 한 달 미만은 한 달로 봅니다.", 12)}
            {check("sme", "세법상 중소기업 요건을 충족합니다")}
            {number("revenue", "해당 사업연도 매출액 (원)", "기업회계기준 매출액입니다. 연간으로 환산하지 않습니다.")}
            {number("proofExcluded", "증빙 요건으로 부인할 금액 (원)", "총액 중 적격증빙 요건을 충족하지 못해 비용에서 제외되는 부분입니다. 건별 예외를 먼저 확인하세요.")}
            {number("culture", "요건을 확인한 문화비 (원)", "증빙 부인액과 아래 시장·상품권 지출을 제외한 금액만 입력합니다.")}
            {number("market", "요건을 확인한 전통시장·지역상품권 지출 (원)")}
            {check("relatedRevenue", "특수관계인과의 거래 매출이 있습니다", "해당하면 자동 계산을 멈추고 별도 한도를 검토합니다.")}
            {check("specialCorp", "축소 한도 적용 법인 또는 정부출자기관입니다", "부동산임대 주업·지배주주 지분·상시근로자 등 적용요건은 Josh 감수 필요.")}
          </>}
          {!unsupported && input.category === "car" && <>
            {number("months", "사업연도 개월 수", undefined, 12)}
            {number("depreciation", "총비용에 포함된 당기 감가상각비 (원)", "법정 정액법·내용연수로 검증한 감가상각비를 입력하세요.")}
            {check("fullYearCar", "사업연도 내내 자가 보유한 차량입니다", "임차·리스는 계산 범위 밖입니다. 일부기간 보유는 체크를 해제하세요.")}
            {check("insured", "전체기간 업무전용보험 요건을 충족합니다", "체크 해제는 연중 전혀 가입하지 않은 경우만 선택합니다. 일부기간만 가입했다면 Josh 감수가 필요합니다.")}
            {check("partialInsurance", "일부기간만 업무전용보험에 가입했습니다", "체크하면 가입일수 안분을 위해 자동 계산을 멈춥니다.")}
            {check("plateCompliant", "법정 번호판 요건 충족 또는 적용 대상이 아닙니다")}
            {check("logbook", "운행기록부를 작성·보관했습니다")}
            {input.logbook && number("businessPercent", "운행기록에 따른 업무사용비율 (%)", "업무용 주행거리 ÷ 총 주행거리입니다.", 100)}
            {check("specialCorp", "부동산임대 주업 등 축소 한도 적용 법인입니다")}
          </>}
          {!unsupported && input.category === "asset" && number("taxDepreciation", "검증한 세법상 상각범위액 (원)", "자산 구분·내용연수·상각률·사용월수·신고방법을 검토해 산정한 한도입니다. 이 도구가 한도를 산정하지는 않습니다.")}
        </form>
        <div className="mt-8 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
          <button type="button" className="underline underline-offset-4" onClick={() => { setInput({ ...DEFAULT_INPUT, category: "car", amount: 20_000_000, depreciation: 12_000_000 }); setMessage(""); }}>예시: 운행기록 없는 승용차</button>
          <button type="button" className="text-muted underline underline-offset-4" onClick={() => { setInput({ ...DEFAULT_INPUT }); setMessage(""); }}>초기화</button>
          <button type="button" disabled={!encoded} onClick={copy} className="underline underline-offset-4 disabled:opacity-40">입력값 포함 링크 복사</button>
        </div>
        <p role="status" className="mt-3 text-xs text-muted">{message}</p>
      </div>
      <div aria-live="polite">
        {result ? <>
          <ExpenseResult input={input} result={result} />
          <a className="no-print mt-8 inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas" href={`/tools/expense-check/report?s=${encoded}`}>검토보고서 (인쇄·PDF)</a>
        </> : <div role="alert" className="border-t border-warn pt-5 text-sm leading-relaxed text-warn"><h2>입력값을 확인해 주세요</h2><ul className="mt-3 list-disc space-y-2 pl-5">{errors.map(e => <li key={e}>{e}</li>)}</ul></div>}
      </div>
    </div>
  </main>;
}
