"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { DEFAULT_INPUT, type CalendarInput } from "@/lib/tax/tax-calendar/input";
import { computeCalendar } from "@/lib/tax/tax-calendar/engine";
import { decodeCalendar, encodeCalendar } from "@/lib/tax/tax-calendar/share";
import { CALENDAR_VERSION } from "@/lib/tax/tax-calendar/version";
import { CalendarResult } from "./CalendarResult";

const selectClass = "mt-2 w-full border border-line bg-paper px-3 py-2 text-ink focus:border-ink focus:outline-2 focus:outline-offset-2";

export function CalendarCalculator() {
  const params = useSearchParams();
  const [initial] = useState(()=>{
    const s=params.get("s");
    return s===null ? null : decodeCalendar(s);
  });
  const [input,setInput] = useState<CalendarInput>(initial?.ok ? initial.input : DEFAULT_INPUT);
  const [message,setMessage] = useState("");
  const result = useMemo(()=>computeCalendar(input),[input]);
  const today = new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
  useEffect(()=>{
    const next = new URLSearchParams(window.location.search);
    next.set("s",encodeCalendar(input));
    window.history.replaceState(null,"",`?${next}`);
  },[input]);
  function update(patch: Partial<CalendarInput>) {setInput(current=>({...current,...patch}));setMessage("");}
  async function copyLink() {
    const url=new URL(window.location.href);
    url.searchParams.set("s",encodeCalendar(input));
    try {await navigator.clipboard.writeText(url.href);setMessage("입력값이 포함된 링크를 복사했습니다.");}
    catch {setMessage("자동 복사가 되지 않았습니다. 주소창의 링크를 복사해 주세요.");}
  }
  return <main className="mx-auto max-w-5xl px-5 py-12">
    <p className="text-xs tracking-[0.18em] text-muted">19 / 연재</p>
    <h1 className="mt-3 text-balance text-3xl font-medium">절세 캘린더</h1>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">내 사업에 해당하는 신고·납부 일정을 한 줄씩 정리합니다. 사업자 유형과 과세 유형을 고르고, 급여와 부동산 관련 의무를 더해 보세요.</p>
    <p className="mt-3 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {CALENDAR_VERSION}</p>
    {initial && !initial.ok && <p role="alert" className="mt-6 border border-accent p-3 text-sm text-accent">{initial.reason} — {LINK_ERROR_NEXT} 현재는 기본 예시 일정입니다.</p>}
    {initial?.ok && initial.ratesChanged && <p role="alert" className="mt-6 border border-warn p-3 text-sm text-warn">법령 버전이 바뀌어 현재 확인한 기준으로 다시 계산했습니다. 날짜와 전제를 확인해 주세요.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="no-print lg:sticky lg:top-8 lg:self-start">
        <form onSubmit={e=>e.preventDefault()} className="space-y-7 text-sm">
          <fieldset className="space-y-5 border-t border-ink pt-4">
            <legend className="pr-3 text-base">사업의 기본 정보</legend>
            <label className="block">일정 연도<select className={selectClass} value={input.year} onChange={e=>update({year:Number(e.target.value)})}><option value={2026}>2026년 (확인한 법령 범위)</option></select></label>
            <label className="block">사업자 유형<select className={selectClass} value={input.entity} onChange={e=>{const entity=e.target.value as CalendarInput["entity"];update({entity,...(entity === "corporation" && input.vat === "simplified" ? {vat:"general" as const} : {})});}}><option value="individual">개인사업자 (거주자)</option><option value="corporation">법인사업자 (내국법인)</option></select></label>
            <label className="block">부가세 과세 유형<select className={selectClass} value={input.vat} onChange={e=>update({vat:e.target.value as CalendarInput["vat"]})}><option value="general">일반과세</option>{input.entity === "individual" && <option value="simplified">간이과세</option>}<option value="exempt">면세만 영위</option></select></label>
            {input.entity === "corporation" && <label className="block">결산월<select className={selectClass} value={input.fiscalEndMonth} onChange={e=>update({fiscalEndMonth:Number(e.target.value)})}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}월</option>)}</select><span className="mt-2 block text-xs leading-relaxed text-muted">해당 월 말에 정상 사업연도가 끝나는 법인 기준입니다.</span></label>}
            <label className="flex items-start gap-2"><input type="checkbox" checked={input.sincere} onChange={e=>update({sincere:e.target.checked})} className="mt-1 accent-ink"/><span>성실신고확인 대상이며 확인서를 제출함<span className="mt-1 block text-xs leading-relaxed text-muted">대상 여부를 먼저 확인하세요. 단순한 신고 방식 선택이 아닙니다.</span></span></label>
          </fieldset>
          <fieldset className="space-y-5 border-t border-line pt-4">
            <legend className="pr-3 text-base">급여·원천세</legend>
            <label className="block">원천세 납부 일정<select className={selectClass} value={input.withholding} onChange={e=>update({withholding:e.target.value as CalendarInput["withholding"]})}><option value="none">표시 안 함</option><option value="monthly">매월 납부</option><option value="semiannual">반기 납부 (승인·적용 확인 완료)</option></select><span className="mt-2 block text-xs leading-relaxed text-muted">반기는 반년씩 모아 내는 방식입니다. 승인·지정 및 제외 징수분은 Josh 감수 필요.</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" checked={input.payroll} onChange={e=>update({payroll:e.target.checked})} className="mt-1 accent-ink"/><span>계속 근무하는 직원의 연말정산 표시</span></label>
          </fieldset>
          <fieldset className="space-y-3 border-t border-line pt-4">
            <legend className="pr-3 text-base">부동산 관련 의무</legend>
            <p className="text-xs leading-relaxed text-muted">납세의무가 있는 항목을 선택하세요. 보유 여부만으로 세금 부과 여부를 판정하지 않습니다.</p>
            {([['house','주택 재산세'],['land','토지 재산세'],['building','주택 외 건축물 재산세'],['comprehensiveProperty','종합부동산세']] as const).map(([key,label])=><label key={key} className="flex items-center gap-2"><input type="checkbox" checked={input[key]} onChange={e=>update({[key]:e.target.checked})} className="accent-ink"/>{label}</label>)}
          </fieldset>
        </form>
        <div className="mt-7 flex flex-wrap gap-3 border-t border-line pt-4 text-sm">
          <button type="button" onClick={copyLink} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas">입력값 포함 링크 복사</button>
          <a href={`/tools/tax-calendar/report?s=${encodeCalendar(input)}`} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</a>
        </div>
        <p role="status" className="mt-3 text-xs text-muted">{message}</p>
      </div>
      <div aria-live="polite"><CalendarResult result={result}/></div>
    </div>
  </main>;
}
