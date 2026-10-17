import { traced, type Traced } from "@/lib/tax/trace";
import type { Basis } from "@/lib/tax/sources";
import { validateInput, type ChecklistInput, type ItemId, type ItemStatus } from "./input";
import { BASIS, COUNT_BASIS, RECEIPT_LIMIT, SMALL_REVENUE_LIMIT } from "./rates";
export type ChecklistItem = { id: ItemId; title: string; detail: string; kind: "신고서·첨부서류" | "준비자료"; status: ItemStatus; trace: Traced };
export type ChecklistResult = { items: ChecklistItem[]; total: Traced; ready: Traced; pending: Traced; unnecessary: Traced; notes: string[] };
export function computeChecklist(input: ChecklistInput): ChecklistResult {
  const errors = validateInput(input);
  if (errors.length) throw new Error(errors.join(" "));
  const items: ChecklistItem[] = [];
  const add = (id: ItemId, title: string, detail: string, basis: Basis[], kind: ChecklistItem["kind"] = "신고서·첨부서류") => {
    items.push({ id, title, detail, kind, status: input.statuses[id] ?? "pending", trace: traced(title, 1, [detail, "이 항목은 서류 한 묶음으로 셉니다."], [...basis, COUNT_BASIS]) });
  };
  add("return", "종합소득 과세표준확정신고 및 납부계산서", "신고의 본문입니다. 소득 유형과 신고방식에 맞는 서식은 제출 단계에서 확인하세요.", [BASIS.returnForm]);
  add("income", "총수입금액과 필요경비 계산에 필요한 서류", "소득금액계산명세서 등 소득 계산의 기초 서류를 확인합니다. 아래 장부 서류와 일부 내용이 겹칠 수 있습니다.", [BASIS.income]);
  if (input.method === "double") {
    add("balance", "재무상태표", "사업의 자산·부채와 자본을 보여주는 표입니다.", [BASIS.books]);
    add("profit", "손익계산서", "수입과 비용으로 사업에서 남긴 소득을 보여주는 표입니다.", [BASIS.books]);
    add("annex", "재무상태표·손익계산서의 부속서류", "사업에 해당하는 세부 명세를 준비합니다. 전자신고 대체 서식과 세부 내역은 Josh 감수 필요.", [BASIS.books]);
    add("trial", "합계잔액시산표", "장부의 계정별 합계와 잔액을 모은 표입니다.", [BASIS.books]);
    add("adjustment", "조정계산서", "회계 소득과 세법상 소득의 차이를 조정합니다. 외부세무조정 해당 여부는 Josh 감수 필요.", [BASIS.books]);
  } else if (input.method === "simple") {
    add("simple", "간편장부소득금액 계산서", "간편장부로 계산한 사업소득을 정리합니다. 간편장부 신고 자격은 별도 확인이 필요합니다.", [BASIS.books, BASIS.forms]);
  } else {
    add("estimate", "추계소득금액 계산서", "장부 없이 계산하는 경우입니다. 해당 신고서 제출로 별도 계산서 제출을 갈음하는 경우도 있습니다. 추계 적정성·경비율은 Josh 감수 필요.", [BASIS.estimate, BASIS.forms]);
  }
  if (input.claimsDeductions) add("deductions", "소득·세액공제 대상임을 증명하는 서류", "신청하는 인적공제·연금보험료공제·특별소득공제·자녀·연금계좌·특별세액공제 등에 맞는 증빙만 준비합니다. 등본·가족관계 증명은 공동이용 확인 가능 여부에 따라 달라집니다.", [BASIS.deductions, BASIS.family]);
  if (input.specialExpenses) add("expenses", "필요경비 산입 명세서", "대손충당금·퇴직급여충당금 및 보험차익·국고보조금으로 취득한 자산 관련 필요경비 명세를 확인합니다. 적용 여부는 Josh 감수 필요.", [BASIS.expenses]);
  if (input.largestOtherReceipt > RECEIPT_LIMIT.value && input.previousRevenue >= SMALL_REVENUE_LIMIT.value && !input.newBusiness && !input.settledBusinessOnly) {
    add("receipts", "영수증 수취명세서", `일반 영수증 거래 중 건당 ${RECEIPT_LIMIT.value.toLocaleString("ko-KR")}원 초과분이 있습니다. 직전 수입금액 ${SMALL_REVENUE_LIMIT.value.toLocaleString("ko-KR")}원 미만·신규·법정 사업소득 연말정산 예외에 해당하지 않는다는 입력에 따른 목록입니다.`, [BASIS.receipts]);
  }
  if (input.profile === "sincere") add("sincere", "성실신고확인서", "장부와 증명서류로 계산한 사업소득의 적정성을 세무사 등이 확인·작성하는 서류입니다.", [BASIS.sincere]);
  if (input.profile === "freelancer" || input.profile === "mixed") add("withholding", "소득별 지급명세서·원천징수 내역", "이미 원천징수한 세금과 소득의 누락·중복 확인에 쓰는 준비자료입니다. 이 목록에서 법정 필수 첨부서류로 판정하지 않습니다.", [{ kind: "assumption", description: "프리랜서·근로 겸업의 대조 자료로 제안합니다. 구체적 자료 범위는 Josh 감수 필요.", editable: true }], "준비자료");
  const count = (label: string, subset: ChecklistItem[]) => traced(label, subset.length, [subset.length ? subset.map(x => x.title).join(" + ") : "해당 항목 없음", "신고서·첨부서류 및 준비자료의 표시 묶음 수를 합산합니다."], [COUNT_BASIS]);
  const notes = [
    "성실신고·기장의무·추계 자격을 자동 판정하지 않습니다. 간이과세는 부가가치세 구분이며 종합소득세 신고방식과 별개입니다. Josh 감수 필요.",
    "이 목록은 소득세법상 주요 서류를 묶어 안내합니다. 홈택스 자동 작성·전자신고 대체·제출 생략 여부와 세부 공제 증빙을 모두 판정하지 않습니다.",
    "신고의무 예외, 비거주자·공동사업·임대·감면·이월결손금 등 개별 서류 및 지방소득세 신고는 미반영입니다. Josh 감수 필요.",
    "불필요 선택은 사용자 판단입니다. 법적 제출의무를 면제하지 않으며, 특히 복식부기의무자의 장부 첨부 누락은 무신고로 볼 수 있습니다. Josh 감수 필요.",
    "귀속연도에 적용되는 개정·경과규정과 실제 전자신고 화면은 Josh 최종 감수가 필요합니다. 실측 미대조.",
  ];
  if (input.profile === "sincere" && input.method !== "double") notes.unshift("성실신고확인 대상인데 복식부기 이외의 방식을 선택했습니다. 장부에 기초한 확인서 작성과 신고방식의 적정성은 Josh 감수 필요.");
  if (input.settledBusinessOnly) notes.unshift("법 제73조 제1항 제4호의 사업소득만 있는 경우에는 확정신고 예외가 있을 수 있습니다. 신고 필요 여부는 Josh 감수 필요.");
  return { items, total: count("표시 서류 묶음", items), ready: count("준비 완료", items.filter(x => x.status === "ready")), pending: count("미준비", items.filter(x => x.status === "pending")), unnecessary: count("직접 불필요로 표시", items.filter(x => x.status === "unnecessary")), notes };
}
