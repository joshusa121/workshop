export type LoanPeriod = { balance: number; days: number };
export type LoanToOwnerInput = {
  periods: LoanPeriod[];
  actualInterest: number;
  rateMode: "weighted" | "overdraft";
  weightedRatePercent: number | null;
  overdraftConfirmed: boolean;
  averageBorrowings: number;
  borrowingInterest: number;
  corpTaxBase: number;
  recipient: "director" | "shareholder";
};
export const DEFAULT_LOAN_INPUT: LoanToOwnerInput = {
  periods: [{ balance: 0, days: 365 }], actualInterest: 0,
  rateMode: "weighted", weightedRatePercent: null, overdraftConfirmed: false,
  averageBorrowings: 0, borrowingInterest: 0, corpTaxBase: 0, recipient: "director",
};
export const SAMPLE_LOAN_INPUT: LoanToOwnerInput = {
  ...DEFAULT_LOAN_INPUT, periods: [{ balance: 100_000_000, days: 365 }],
  rateMode: "overdraft", overdraftConfirmed: true,
  averageBorrowings: 200_000_000, borrowingInterest: 10_000_000, corpTaxBase: 199_000_000,
};

/** 외부 링크도 동일하게 검증한다. 누락값을 예시 금액으로 복원하지 않는다. */
export function loanInputErrors(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["입력 형식을 확인해 주세요."];
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
  const money = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000_000_000;
  if (!Array.isArray(r.periods) || r.periods.length < 1 || r.periods.length > 12) errors.push("잔액 기간을 한 개 이상, 열두 개 이내로 입력해 주세요.");
  else {
    let days = 0;
    for (const p of r.periods) {
      if (!p || typeof p !== "object" || !money(p.balance) || !Number.isInteger(p.days) || p.days < 1 || p.days > 365) {
        errors.push("잔액은 음수가 아닌 정수 원, 일수는 1~365일로 입력해 주세요."); break;
      }
      days += p.days;
    }
    if (days > 365) errors.push("기간별 일수 합계는 365일을 넘을 수 없습니다. 겹치는 기간이 없는지 확인해 주세요.");
  }
  for (const [key, label] of [["actualInterest", "실제 받은 이자"], ["averageBorrowings", "연평균 차입금"], ["borrowingInterest", "차입금 지급이자"], ["corpTaxBase", "법인 과세표준"]]) {
    if (!money(r[key])) errors.push(`${label}은 음수가 아닌 정수 원으로 입력해 주세요(최대 10조원).`);
  }
  if (r.rateMode !== "weighted" && r.rateMode !== "overdraft") errors.push("이자율 적용 방식을 선택해 주세요.");
  if (typeof r.overdraftConfirmed !== "boolean") errors.push("당좌대출이자율 적용 확인 값이 없습니다.");
  if (r.rateMode === "weighted" && (typeof r.weightedRatePercent !== "number" || !Number.isFinite(r.weightedRatePercent) || r.weightedRatePercent < 0 || r.weightedRatePercent > 100 || Math.abs(r.weightedRatePercent * 100 - Math.round(r.weightedRatePercent * 100)) > 1e-8)) errors.push("확인한 가중평균차입이자율을 소수 둘째 자리까지 입력해 주세요. 더 정밀한 이자율은 Josh 감수 필요.");
  if (r.rateMode === "overdraft" && r.overdraftConfirmed !== true) errors.push("당좌대출이자율 적용 사유 또는 선택 신고·구속기간을 확인해 주세요.");
  if (r.averageBorrowings === 0 && typeof r.borrowingInterest === "number" && r.borrowingInterest > 0) errors.push("지급이자가 있으면 연평균 차입금도 입력해 주세요.");
  if (r.recipient !== "director" && r.recipient !== "shareholder") errors.push("돈을 가져간 사람의 지위를 선택해 주세요.");
  return errors;
}
export function isLoanInput(raw: unknown): raw is LoanToOwnerInput { return loanInputErrors(raw).length === 0; }
