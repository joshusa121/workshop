import type { Basis } from "@/lib/tax/sources";
import { traced, type Traced } from "@/lib/tax/trace";
import { parseInput, type CalendarInput } from "./input";
import { BASIS as B, DEADLINES as D } from "./rates";

export type CalendarEvent = {
  id: string; title: string; month: number;
  /** 날짜가 없는 급여 지급 시점은 null. 임의의 말일을 법정기한으로 만들지 않는다. */
  date: string | null; startsOn?: string; timing?: string;
  period: string; note: string; conditional: boolean; trace: Traced;
};
export type CalendarResult = { events: CalendarEvent[]; count: Traced; year: Traced; notes: string[] };

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function computeCalendar(raw: CalendarInput): CalendarResult {
  const input = parseInput(raw);
  if (!input) throw new Error("입력값을 확인해 주세요. 확인한 연도와 사업자 유형만 지원합니다.");
  const y = input.year;
  const events: CalendarEvent[] = [];
  function add(id: string, title: string, month: number, day: number, period: string, basis: Basis[], note: string, conditional = false, startsOn?: string) {
    const date = iso(y, month, day);
    events.push({ id, title, month, date, period, note, conditional, startsOn,
      trace: traced(`${title} 법정 명목일`, Number(date.replaceAll("-", "")),
        [period, ...(startsOn ? [`기간 시작 ${startsOn}`] : []), `법정 명목일 ${date}`, note, "토요일·일요일·공휴일 이연 및 개별 기한 연장은 미반영"], basis) });
  }
  if (input.vat === "general") {
    add("vat-final-prev", "부가세 하반기 확정신고·납부", 1, D.vatDays, `${y-1}년 하반기`, [B.vatPeriod,B.vatFinal], "전년 말에 끝난 과세기간의 확정신고입니다.");
    for (const [month,id,period] of [[4,"first","상반기 예정분"],[10,"second","하반기 예정분"]] as const) {
      add(`vat-advance-${id}`, input.entity === "individual" ? "부가세 예정고지 확인·납부" : "부가세 예정신고·고지 확인", month, D.vatDays, `${y}년 ${period}`, [B.vatAdvance],
        "예정신고·예정고지 대상 구분, 징수 제외 및 사업 부진 등에 따른 신고 여부는 Josh 감수 필요. 고지서와 대조하세요.", true);
    }
    add("vat-final-first", "부가세 상반기 확정신고·납부", 7, D.vatDays, `${y}년 상반기`, [B.vatPeriod,B.vatFinal], "하반기 확정신고는 다음 연도 캘린더에 속합니다.");
  } else if (input.vat === "simplified") {
    add("vat-simple-final", "간이 부가세 확정신고·납부", 1, D.vatDays, `${y-1}년 연간`, [B.vatPeriod,B.vatSimple], "전년 연간 과세기간의 확정신고입니다.");
    add("vat-simple-july", "간이 부가세 예정부과·신고 확인", 7, D.vatDays, `${y}년 상반기`, [B.vatSimpleJuly], "해당 시에만 납부·신고합니다. 징수 제외, 세금계산서 발급에 따른 신고 의무 등은 Josh 감수 필요.", true);
  }
  if (input.entity === "individual") {
    const month = input.sincere ? D.sincereMonth : D.incomeMonth;
    add("income-final", input.sincere ? "종합소득세 성실신고·납부" : "종합소득세 확정신고·납부", month, lastDay(y,month), `${y-1}년 귀속`, [input.sincere ? B.sincere : B.income,B.incomePayment],
      input.sincere ? "성실신고확인 대상임을 확인하고 확인서를 제출하는 전제입니다." : "종합소득 확정신고 의무가 있는 거주자 개인사업자를 전제로 합니다.", false, iso(y,5,1));
  } else {
    const offset = input.sincere ? D.sincereCorpMonths : D.corpMonths;
    const total = input.fiscalEndMonth + offset;
    const month = ((total - 1) % 12) + 1;
    const closingYear = total > 12 ? y - 1 : y;
    add("corp-final", input.sincere ? "법인세 성실신고·납부" : "법인세 확정신고·납부", month,lastDay(y,month), `${closingYear}년 ${input.fiscalEndMonth}월 결산 사업연도`, [B.corporation,B.corporationPayment],
      `사업연도 종료월 말일부터 ${offset}개월. 내국법인·정상 사업연도 전제이며 성실신고 대상 여부는 Josh 감수 필요.`);
  }
  if (input.withholding === "monthly") {
    for (let m=1;m<=12;m++) add(`withholding-${m}`, "원천세 월별 납부",m,D.withholdingDay,`${m===1?y-1:y}년 ${m===1?12:m-1}월 징수분`,[B.withholding],"지방소득세 특별징수·지급명세서 제출기한은 포함하지 않습니다.");
  } else if (input.withholding === "semiannual") {
    add("withholding-prev","원천세 반기 납부",1,D.withholdingDay,`${y-1}년 하반기 징수분`,[B.semiannual],"반기납부 승인·지정과 적용 가능 징수분을 확인한 전제. 제외 징수분은 월별 납부 등 별도 확인.");
    add("withholding-first","원천세 반기 납부",7,D.withholdingDay,`${y}년 상반기 징수분`,[B.semiannual],"당년 하반기 징수분 납부는 다음 연도에 속합니다.");
  }
  if (input.payroll) events.push({ id: "payroll-settlement", title: "계속 근로자 연말정산", month: 2, date: null,
    timing: "2월분 급여 지급 시", period: `${y-1}년 귀속`, note: "지급 시점에 정산합니다. 세무서 납부일·자료 제출기한과 다릅니다. 중도퇴사·급여 미지급 특례는 미반영.", conditional: false,
    trace: traced("연말정산 시점",2,[`${y-1}년 귀속`,"다음 연도 2월분 근로소득 지급 시 원천징수","임의의 2월 말일을 법정기한으로 산정하지 않음"],[B.payroll]) });
  if (input.building) add("property-building","건축물 재산세 납부",7,31,`${y}년 부과분`,[B.property],"주택 외 건축물의 일반 납기입니다.",false,iso(y,7,D.propertyStart));
  if (input.house) {
    add("property-house-first","주택 재산세 앞부분 납부",7,31,`${y}년 부과분`,[B.property],"원칙적으로 나누어 납부합니다. 소액 주택의 일괄부과는 조례·고지서 확인, Josh 감수 필요.",false,iso(y,7,D.propertyStart));
    add("property-house-second","주택 재산세 나머지 납부",9,30,`${y}년 부과분`,[B.property],"앞선 납기에 전액 부과된 경우 이 일정은 해당하지 않습니다. 고지서 확인, Josh 감수 필요.",true,iso(y,9,D.propertyStart));
  }
  if (input.land) add("property-land","토지 재산세 납부",9,30,`${y}년 부과분`,[B.property],"토지의 일반 납기입니다.",false,iso(y,9,D.propertyStart));
  if (input.comprehensiveProperty) add("comprehensive-property","종합부동산세 납부",12,D.comprehensiveEnd,`${y}년 부과분`,[B.comprehensiveProperty],"종부세 납세의무가 있음을 확인한 전제입니다. 신고납부 선택 시에도 같은 기간입니다.",false,iso(y,12,D.comprehensiveStart));
  events.sort((a,b)=>a.month-b.month || (a.date??"z").localeCompare(b.date??"z") || a.id.localeCompare(b.id));
  const assumption: Basis = {kind:"assumption",description:"선택한 사업자·과세 유형과 사용자가 확인한 의무를 기준으로 조건부 확인 일정까지 센 건수입니다. 실제 납부 횟수와 다릅니다.",editable:true};
  return { events,
    count: traced("확인할 일정 수",events.length,events.map(e=>`${e.date??e.timing} ${e.title}${e.conditional?" (해당 시)":""}`),[assumption]),
    year: traced("일정이 도래하는 연도",y,["확인한 법령 버전으로 2026년에 도래하는 법정 명목일만 표시","귀속연도·사업연도는 각 일정에 별도 표시"],[{kind:"assumption",description:"확인 범위인 2026년만 지원합니다. 다른 연도·개정 전후 특례는 Josh 감수 필요.",editable:true}]),
    notes: [
      "모든 날짜는 휴일 이연 전 법정 명목일입니다. 토요일·일요일·공휴일, 임시공휴일, 재난 등에 따른 기한 연장·유예는 반영하지 않았습니다. 실제 기한은 고지서·홈택스·위택스로 확인하세요.",
      "현재 확인한 법령을 기준으로 반복 기한을 정리한 참고용 캘린더입니다. 연중 개정·경과규정의 개별 적용은 Josh 감수 필요.",
      "조건부 일정은 모두에게 납부 의무가 있다는 뜻이 아닙니다. 예정고지 제외·간이 예정신고·원천세 반기납부 자격은 자동 판정하지 않습니다.",
      "성실신고확인 대상과 확인서 제출 여부는 사용자가 확인합니다. 신고기한 연장 요건을 충족하지 못하면 일반 신고기한이 적용될 수 있습니다.",
      "재산세는 납세의무가 있는 자산을 선택한 전제입니다. 조례에 따른 소액 주택 일괄부과와 수시부과는 자동 판정하지 않습니다. 해당 지자체 조례·고지서는 Josh 감수 필요.",
      "신규·폐업·과세유형 전환·비거주자·사망·출국·연결납세·합병·특수 사업연도·분납·중도퇴사·급여 미지급 특례는 미반영입니다.",
      "면세사업자 사업장현황신고, 중간예납, 지방소득세, 지급명세서 등 모든 세무 의무를 망라하지 않습니다. 표시되지 않았다고 의무가 없다는 뜻은 아닙니다.",
      "공식 서비스 실측 미대조. 법령 원문 및 독립 fixture와 대조했으며, Josh 최종 감수가 필요합니다.",
    ] };
}
