"use client";

import { useSearchParams } from "next/navigation";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { computeCalendar } from "@/lib/tax/tax-calendar/engine";
import { decodeCalendar } from "@/lib/tax/tax-calendar/share";
import { CALENDAR_VERSION } from "@/lib/tax/tax-calendar/version";
import { traced } from "@/lib/tax/trace";
import { BASIS } from "@/lib/tax/tax-calendar/rates";
import { CalendarTrace } from "./CalendarTrace";
import { CalendarResult } from "./CalendarResult";

export function CalendarReport() {
  const params=useSearchParams();
  const s=params.get("s");
  const decoded=s === null ? null : decodeCalendar(s);
  const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
  const input=decoded?.ok ? decoded.input : null;
  return <article className="mx-auto max-w-3xl px-5 py-10 print:max-w-none print:px-0">
    <div className="no-print mb-8 flex items-center justify-between gap-3 text-sm"><a href={input ? `/tools/tax-calendar?s=${s}` : "/tools/tax-calendar"} className="underline">입력 화면으로</a><button type="button" onClick={()=>window.print()} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas">인쇄/PDF 저장</button></div>
    <header className="border-b-2 border-ink pb-6">
      <p className="text-xs tracking-[0.18em] text-muted">19 / 연재 · 검토보고서</p>
      <h1 className="mt-2 text-balance text-2xl font-medium">절세 캘린더 검토보고서</h1>
      <p className="mt-2 text-xs text-muted">작업실 · 작성일 {today} · 세율 버전 {CALENDAR_VERSION}</p>
    </header>
    {decoded && !decoded.ok && <p role="alert" className="mt-6 text-sm text-accent">{decoded.reason} — {LINK_ERROR_NEXT}</p>}
    {decoded?.ok && decoded.ratesChanged && <p role="alert" className="mt-6 text-sm text-warn">법령 버전이 바뀌어 현재 기준으로 다시 계산했습니다. 이전 보고서와 날짜·전제가 달라질 수 있습니다.</p>}
    {input ? <div className="mt-8">
      <section className="mb-8 border-b border-line pb-6 text-sm leading-relaxed">
        <h2 className="text-base">입력 전제</h2>
        <p className="mt-2">{input.entity === "individual" ? "거주자 개인사업자" : <>내국법인 · <CalendarTrace t={traced("입력한 결산월",input.fiscalEndMonth,["사용자가 선택한 정상 사업연도 종료월",`${input.fiscalEndMonth}월 말일 결산 전제`],[BASIS.corporation])} text={`${input.fiscalEndMonth}월 결산`}/></>} / {{general:"일반과세",simplified:"간이과세",exempt:"면세만 영위"}[input.vat]}</p>
        <p>성실신고확인서: {input.sincere ? "대상 확인 후 제출" : "일반 기한 적용"}</p>
        <p>원천세: {{none:"일정 표시 안 함",monthly:"매월 납부",semiannual:"반기납부 승인·적용 확인 전제"}[input.withholding]} / 연말정산: {input.payroll ? "계속 근로자 일정 표시" : "표시 안 함"}</p>
        <p>부동산: {[input.house&&"주택 재산세",input.land&&"토지 재산세",input.building&&"건축물 재산세",input.comprehensiveProperty&&"종합부동산세"].filter(Boolean).join(", ") || "표시 안 함"}</p>
      </section>
      <CalendarResult result={computeCalendar(input)}/>
    </div> : <p className="mt-8 text-sm leading-relaxed text-muted">입력값이 담긴 링크로 열어야 보고서가 채워집니다. 절세 캘린더에서 「검토보고서 (인쇄·PDF)」를 눌러 주세요.</p>}
  </article>;
}
