import { parseInput, type CalendarInput } from "./input";
import { CALENDAR_VERSION } from "./version";

export function encodeCalendar(input: CalendarInput): string {
  return btoa(JSON.stringify({v:1,r:CALENDAR_VERSION,d:input})).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export type DecodeResult = {ok:true;input:CalendarInput;ratesChanged:boolean} | {ok:false;reason:string};
export function decodeCalendar(s: string): DecodeResult {
  if (s.length>12000) return {ok:false,reason:"손상된 링크"};
  try {
    const p = JSON.parse(atob(s.replace(/-/g,"+").replace(/_/g,"/")));
    if (typeof p!=="object" || p===null) return {ok:false,reason:"손상된 링크"};
    if (p.v!==1) return {ok:false,reason:"만료된 형식"};
    const input=parseInput(p.d);
    if (!input || typeof p.r!=="string") return {ok:false,reason:"손상된 링크"};
    return {ok:true,input,ratesChanged:p.r!==CALENDAR_VERSION};
  } catch {return {ok:false,reason:"손상된 링크"};}
}
