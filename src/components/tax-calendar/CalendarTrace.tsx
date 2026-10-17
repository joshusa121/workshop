"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Traced } from "@/lib/tax/trace";

/** 날짜·건수에는 원화 단위를 붙이지 않는다. 공용 Traced의 근거 구조는 그대로 사용한다. */
export function CalendarTrace({ t, text }: { t: Traced; text: string }) {
  const [open,setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if(e.key === "Escape") {setOpen(false);button.current?.focus();} };
    document.addEventListener("mousedown",close);
    document.addEventListener("keydown",escape);
    return () => {document.removeEventListener("mousedown",close);document.removeEventListener("keydown",escape);};
  },[open]);
  return <span ref={ref} className="relative inline-block">
    <button ref={button} type="button" aria-expanded={open} aria-controls={id} aria-label={`${t.label}: ${text} — 근거 보기`}
      onClick={()=>setOpen(!open)} className="border-b border-dashed border-current text-left hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 print:border-0">{text}</button>
    {open && <span id={id} role="dialog" aria-label={`${t.label} 근거`} className="no-print absolute left-0 top-full z-30 mt-2 block max-h-[70vh] w-64 max-w-[75vw] overflow-y-auto border border-ink bg-paper p-4 text-left font-sans text-xs font-normal leading-relaxed text-ink shadow-sm sm:w-80">
      <span className="block font-medium">{t.label}</span>
      {t.steps.map((s,i)=><span key={i} className="mt-2 block">{s}</span>)}
      <span className="mt-3 block border-t border-line pt-2">
        {t.basis.map((b,i)=><span key={i} className="mt-2 block">{b.kind === "law" ? <a href={b.url} target="_blank" rel="noreferrer" className="underline">{b.law} {b.article} · 조문 시행 {b.effectiveFrom} · 확인 {b.confirmedAt}<span className="mt-1 block">{b.appliesTo}</span></a> : b.kind === "official" ? <a href={b.url} target="_blank" rel="noreferrer" className="underline">{b.source}</a> : `가정: ${b.description}`}</span>)}
      </span>
      <button type="button" onClick={()=>{setOpen(false);button.current?.focus();}} className="mt-3 underline">닫기</button>
    </span>}
  </span>;
}
