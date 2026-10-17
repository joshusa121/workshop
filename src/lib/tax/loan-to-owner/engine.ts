import { applyBrackets } from "@/lib/tax/progressive";
import { floorWon } from "@/lib/tax/rounding";
import { traced, type Traced } from "@/lib/tax/trace";
import { formatWon } from "@/lib/won";
import { loanInputErrors, type LoanToOwnerInput } from "./input";
import { CALCULATION_ASSUMPTION, CORP_BRACKETS, DIFFERENCE_THRESHOLD, DISALLOWANCE_BASIS, DISPOSITION_BASIS, DIVIDEND_BASIS, INPUT_ASSUMPTION, LOCAL_BRACKETS, OVERDRAFT_RATE, RECOGNITION_BASIS, SALARY_BASIS, WEIGHTED_BASIS } from "./rates-2026";

export type LoanToOwnerResult = {
  balanceDays: Traced; normalInterest: Traced; interestShortfall: Traced;
  recognizedInterest: Traced; disallowedInterest: Traced; incomeAddition: Traced;
  corpTaxIncrease: Traced; localTaxIncrease: Traced; totalCorpTaxIncrease: Traced;
  personalIncomeAddition: Traced; disposition: "상여(근로소득)" | "배당소득";
  ratePercent: number; thresholdApplies: boolean; notes: string[];
};

export function computeLoanToOwner(input: LoanToOwnerInput): LoanToOwnerResult {
  const errors = loanInputErrors(input);
  if (errors.length) throw new Error(errors.join(" "));
  const ratePercent = input.rateMode === "overdraft" ? OVERDRAFT_RATE.value * 100 : input.weightedRatePercent!;
  const rateBasis = input.rateMode === "overdraft" ? OVERDRAFT_RATE.basis : WEIGHTED_BASIS;
  const rateBps = BigInt(Math.round(ratePercent * 100));
  // 적수와 이자율을 정수 비율로 비교해 5% 경계의 부동소수점 오차를 막는다.
  const sum = input.periods.reduce((s, p) => s + BigInt(p.balance) * BigInt(p.days), BigInt(0));
  const denominator = BigInt(365 * 10_000);
  const gross = sum * rateBps;
  const diff = gross > BigInt(input.actualInterest) * denominator ? gross - BigInt(input.actualInterest) * denominator : BigInt(0);
  const thresholdApplies = diff > BigInt(0) && (diff >= BigInt(DIFFERENCE_THRESHOLD.value.amount) * denominator || diff * BigInt(20) >= gross);
  const common = [RECOGNITION_BASIS, rateBasis, CALCULATION_ASSUMPTION, INPUT_ASSUMPTION];
  const balanceDays = traced("잔액×일수 합계(원·일)", Number(sum), input.periods.map(p => `${formatWon(p.balance)} × ${p.days}일`), [INPUT_ASSUMPTION, CALCULATION_ASSUMPTION, DISALLOWANCE_BASIS]);
  const normalInterest = traced("세법상 정상 이자", Number(gross / denominator), [`적수 ${Number(sum).toLocaleString("ko-KR")}원·일 × 연 ${ratePercent.toFixed(2)}% ÷ 365일`, "원 미만 절사(진단 표시 가정)"], common);
  const interestShortfall = traced("정상 이자보다 부족한 금액", Number(diff / denominator), [`정상 이자(절사 전) − 실제 이자 ${formatWon(input.actualInterest)}, 음수는 없음`], common);
  const recognizedInterest = traced("과세소득에 더할 인정이자", thresholdApplies ? interestShortfall.value : 0, [
    "인정이자: 실제 받은 이자가 정상 이자에 못 미쳐 세법상 이익으로 더하는 금액",
    `차액이 3억원 이상 또는 정상 이자의 5% 이상인지 절사 전 비교: ${thresholdApplies ? "해당" : "미해당"}`,
    "해당하면 기준 초과분이 아닌 차액 전액을 반영. 거래 합산 단위 및 실제 이자 반영 Josh 감수 필요",
  ], common);
  const borrowingSum = BigInt(input.averageBorrowings) * BigInt(365);
  const limitedSum = sum < borrowingSum ? sum : borrowingSum;
  const denied = borrowingSum === BigInt(0) ? 0 : Number(BigInt(input.borrowingInterest) * limitedSum / borrowingSum);
  const disallowedInterest = traced("비용으로 인정되지 않는 차입금 이자", denied, [
    `지급이자 ${formatWon(input.borrowingInterest)} × min(가지급금 적수, 총차입금 적수) ÷ 총차입금 적수`,
    `총차입금 적수 = 연평균 차입금 ${formatWon(input.averageBorrowings)} × 365일`,
    "차입금이 없으면 지급이자 부인 없음. 다른 업무무관 자산은 없다고 가정",
  ], [DISALLOWANCE_BASIS, INPUT_ASSUMPTION, CALCULATION_ASSUMPTION]);
  const addition = recognizedInterest.value + denied;
  const incomeAddition = traced("법인 과세소득 증가", addition, [`인정이자 ${formatWon(recognizedInterest.value)} + 지급이자 비용 제한 ${formatWon(denied)}`], [...common, DISALLOWANCE_BASIS]);
  function increase(table: typeof CORP_BRACKETS, label: string): Traced {
    const before = applyBrackets(input.corpTaxBase, table, "조정 전", floorWon);
    const after = applyBrackets(input.corpTaxBase + addition, table, "조정 후", floorWon);
    return traced(label, after.value - before.value, [
      `조정 전 과세표준 ${formatWon(input.corpTaxBase)}, 조정 후 ${formatWon(input.corpTaxBase + addition)}`,
      `조정 후 산출세액 ${formatWon(after.value)} − 조정 전 ${formatWon(before.value)}`,
      ...after.steps, "세액공제·결손금·신고 납부 끝수 미반영, 산출세액 차이의 추정값",
    ], [table.basis, INPUT_ASSUMPTION, CALCULATION_ASSUMPTION]);
  }
  const corpTaxIncrease = increase(CORP_BRACKETS, "법인세 산출세액 증가 추정");
  const localTaxIncrease = increase(LOCAL_BRACKETS, "법인지방소득세 산출세액 증가 추정");
  const totalCorpTaxIncrease = traced("회사 세금 증가 추정 합계", corpTaxIncrease.value + localTaxIncrease.value,
    [`법인세 ${formatWon(corpTaxIncrease.value)} + 법인지방소득세 ${formatWon(localTaxIncrease.value)}`], [CORP_BRACKETS.basis, LOCAL_BRACKETS.basis, CALCULATION_ASSUMPTION]);
  const disposition = input.recipient === "director" ? "상여(근로소득)" : "배당소득";
  const personalIncomeAddition = traced("개인 소득처분 검토액", recognizedInterest.value, [
    `사외유출 및 귀속이 확정되면 ${disposition} 검토`,
    "원금 자체의 소득처분 아님. 지급이자 부인액은 기타 사외유출이므로 더하지 않음",
    "미수이자 회수·약정 및 소득처분 시기 Josh 감수 필요. 개인 납부세액은 미계산",
  ], [DISPOSITION_BASIS, input.recipient === "director" ? SALARY_BASIS : DIVIDEND_BASIS]);
  return { balanceDays, normalInterest, interestShortfall, recognizedInterest, disallowedInterest, incomeAddition,
    corpTaxIncrease, localTaxIncrease, totalCorpTaxIncrease, personalIncomeAddition, disposition, ratePercent, thresholdApplies,
    notes: [
      "2026년 12개월 사업연도인 일반 내국법인, 동일 개인의 단일 업무무관 대여, 특수관계인이라는 전제입니다. 해당 여부는 Josh 감수 필요.",
      "기간은 서로 겹치지 않게 입력합니다. 연평균 차입금은 총차입금 적수를 365일로 나눈 값입니다. 동일인 가수금 상계, 제외 차입금, 다른 업무무관 자산은 입력 전 Josh 감수 필요.",
      "가중평균차입이자율이 원칙입니다. 당좌대출이자율 선택 신고·적용 예외·이후 사업연도 구속기간 및 장기대여금 여부는 Josh 감수 필요.",
      "실제 이자는 해당 기간분의 세무상 수익으로 반영된 금액을 입력합니다. 미수이자 약정·회수, 거래 합산 단위와 소득처분 시기는 Josh 감수 필요.",
      "원금의 상여 처분, 대손금 제한, 증여세, 가산세, 개인 최종 소득세·지방소득세·건강보험료는 미반영입니다. 개인 세금이 없다는 뜻이 아닙니다.",
      "회사 세금은 산출세액 증가 추정입니다. 결손금·세액공제·조례 가감·외국세액·단기사업연도·특정 소규모법인 세율 및 연중 개정 경과규정은 미반영입니다.",
      "공식 계산기 실측 미대조. 원 미만 절사와 일수 산정은 진단 가정으로 신고용 금액과 다를 수 있습니다. Josh 최종 감수 대기.",
    ] };
}
