import type { Basis } from "@/lib/tax/sources";
import { traced, type Traced } from "@/lib/tax/trace";
import { floorWon } from "@/lib/tax/rounding";
import { auditRiskInputErrors, type AuditRiskInput } from "./input";
import { INPUT_BASIS, LAW_BASES as L, REVIEW_POLICY } from "./rates";

export type AuditRiskLevel = "priority" | "review" | "incomplete" | "no-signals";
export type AuditRiskCheck = { id: string; label: string; state: "priority" | "review" | "clear" | "unknown" | "excluded"; reason: string; action: string; basis: Basis[] };
export type AuditRiskResult = {
  level: AuditRiskLevel; expertReview: true; checks: AuditRiskCheck[];
  annualRevenue: Traced; totalExpenses: Traced; cashPercent: Traced; fakePercent: Traced;
  cashRevenue: Traced; suspectedFakeExpenses: Traced; ownerAdvance: Traced; entertainmentExcess: Traced; undocumentedPurchases: Traced;
  flaggedCount: Traced; priorityCount: Traced; unknownCount: Traced; applicableCount: Traced;
  notes: string[];
};

/** 금액×비율은 정수 비로 계산해 부동소수점 연산의 원 단위 오차를 피한다. */
function portion(amount: number, percent: number) {
  return floorWon(Number(BigInt(amount) * BigInt(Math.round(percent * 100)) / BigInt(10_000)));
}

export function computeAuditRisk(input: AuditRiskInput): AuditRiskResult {
  const errors = auditRiskInputErrors(input);
  if (errors.length) throw new Error(errors.join(" "));
  const i = input;
  const corporate = i.entity === "corporation";
  const evidence = corporate ? L.corporationEvidence : L.individualEvidence;
  const expenses = corporate ? L.corporationExpenses : L.individualExpenses;
  const entertainment = corporate ? L.corporationEntertainment : L.individualEntertainment;
  const money = (label: string, value: number, basis: Basis[]) => traced(label, value, [`입력 금액 ${value.toLocaleString("ko-KR")}원. 추가 세액이 아닙니다.`], [INPUT_BASIS, ...basis]);
  const annualRevenue = money("총수입금액", i.annualRevenue, [L.selection]);
  const totalExpenses = money("장부에 반영한 경비 총액", i.totalExpenses, [expenses]);
  const cashPercent = traced("현금수입 비중", i.cashRevenuePercent, ["총수입금액 중 현금으로 받은 수입의 비중을 사용자가 입력. 법정 조사 기준 비율이 아님"], [INPUT_BASIS, L.selection]);
  const fakePercent = traced("가공경비 의심 비중", i.suspectedFakeExpensePercent, ["장부 경비 중 실제 거래가 없다고 의심하는 경비의 비중을 사용자가 입력. 증빙이 없다는 이유만으로 가공 확정 금지"], [INPUT_BASIS, expenses, L.selection]);
  const cashRevenue = traced("현금수입 환산액", portion(i.annualRevenue, i.cashRevenuePercent), [`총수입금액 ${i.annualRevenue.toLocaleString("ko-KR")}원 × ${i.cashRevenuePercent} ÷ 100 (원 미만 버림)`, "현금 거래 자체는 탈루나 조사 사유로 확정하지 않음"], [INPUT_BASIS, L.selection]);
  const suspectedFakeExpenses = traced("가공경비 의심 환산액", portion(i.totalExpenses, i.suspectedFakeExpensePercent), [`장부 경비 ${i.totalExpenses.toLocaleString("ko-KR")}원 × ${i.suspectedFakeExpensePercent} ÷ 100 (원 미만 버림)`, "신고 오류·실제 거래 여부는 전문가 확인"], [INPUT_BASIS, expenses, L.selection]);
  const ownerAdvance = money("대표 가지급금", i.ownerAdvance, corporate ? [L.ownerAdvance, L.relatedParty] : []);
  const entertainmentExcess = money("기업업무추진비 한도초과액", i.entertainmentExcess, [entertainment]);
  const undocumentedPurchases = money("무자료 매입액", i.undocumentedPurchases, [evidence, L.selection]);
  const checks: AuditRiskCheck[] = [
    { id: "cash", label: "현금수입", state: i.cashRevenuePercent > 0 ? "review" : "clear", reason: "현금 거래 자체는 위법이 아닙니다. 현금으로 받은 매출과 신고액이 맞는지 확인합니다.", action: "현금출납장·현금영수증·매출 신고자료 대조", basis: [L.selection] },
    { id: "fake", label: "가공경비 의심", state: i.suspectedFakeExpensePercent > 0 ? "priority" : "clear", reason: "실제 거래가 없는 비용을 넣었다는 의심은 거래 사실부터 확인해야 합니다.", action: "계약·납품·용역 수행·대금 지급 자료 확인", basis: [expenses, L.selection] },
    { id: "advance", label: "대표 가지급금", state: !corporate ? "excluded" : i.ownerAdvance > 0 ? "review" : "clear", reason: "법인이 대표에게 지급한 돈의 업무 관련성·대여 조건·세무조정을 확인합니다. 개인사업자는 이 항목을 제외합니다.", action: "대여 약정·잔액·이자 수수·세무조정 명세 확인", basis: [L.ownerAdvance, L.relatedParty] },
    { id: "entertainment", label: "접대비 한도초과", state: i.entertainmentExcess > 0 ? "review" : "clear", reason: "기업업무추진비(접대비)의 한도초과 자체로 탈루를 단정하지 않습니다. 신고 때 비용에서 제외했는지 확인합니다.", action: "확인한 한도 계산서·증빙·신고 조정명세 대조", basis: [entertainment] },
    { id: "undocumented", label: "무자료 매입", state: i.undocumentedPurchases > 0 ? "priority" : "clear", reason: "장부 경비에 포함된 매입 중 세금계산서 등 거래 증빙을 확보하지 못한 금액입니다. 법정 예외와 실제 거래 여부를 따로 확인합니다.", action: "거래 사실·지급 자료·적격증빙 수취 예외 확인", basis: [evidence, L.selection] },
    { id: "compliance", label: "신고·확인서 제출", state: i.compliance === "unknown" ? "unknown" : i.compliance === "unmet" ? "priority" : "clear", reason: "본인에게 적용되는 신고·성실신고확인서 등 납세협력의무를 확인한 상태입니다. 해당 의무와 대상 여부는 자동 판정하지 않습니다.", action: "신고 접수증·첨부서류·확인서 제출 여부 검토", basis: [L.selection, corporate ? L.corporationFiling : L.sincere] },
  ];
  const priority = checks.filter(c => c.state === "priority");
  const flagged = checks.filter(c => c.state === "priority" || c.state === "review");
  const unknown = checks.filter(c => c.state === "unknown");
  const count = (label: string, selected: AuditRiskCheck[]) => traced(label, selected.length, [selected.length ? selected.map(c => c.label).join(", ") : "해당 항목 없음", "각 항목은 한 번만 셈. 위험점수·조사 확률이 아님"], [REVIEW_POLICY, L.selection]);
  return {
    level: priority.length ? "priority" : flagged.length ? "review" : unknown.length ? "incomplete" : "no-signals",
    expertReview: true, checks, annualRevenue, totalExpenses, cashPercent, fakePercent, cashRevenue, suspectedFakeExpenses, ownerAdvance, entertainmentExcess, undocumentedPurchases,
    flaggedCount: count("점검 징후 항목 수", flagged), priorityCount: count("우선 검토 항목 수", priority), unknownCount: count("미확인 항목 수", unknown), applicableCount: count("적용 항목 수", checks.filter(c => c.state !== "excluded")),
    notes: [
      "검토 우선순위는 도구의 가정입니다. 세무조사 대상 확정·국세청 선정점수·조사 확률을 뜻하지 않습니다. 분류의 실무 적정성은 Josh 감수 필요.",
      "입력상 징후가 없어도 무작위 표본선정·정기선정·탈세 제보·외부 과세자료에 따른 세무조사가 가능합니다.",
      "같은 연도·사업연도의 장부 금액을 사용합니다. 가지급금은 기말 잔액으로 입력하며 발생 시기와 연중 변동은 반영하지 않습니다.",
      "각 비용 지표는 서로 겹칠 수 있어 합산하지 않습니다. 표시 금액은 추가 세액·과세표준이 아닙니다.",
      "가산세·인정이자·지급이자 제한·소득처분·추징세액·접대비 한도·성실신고 대상 수입금액 기준은 계산하지 않습니다. Josh 감수 필요.",
      "무자료 매입의 적격증빙 수취 예외·비용 인정 여부, 대표 대여금의 업무 관련성, 이미 반영한 세무조정은 전문가 확인이 필요합니다.",
    ],
  };
}
