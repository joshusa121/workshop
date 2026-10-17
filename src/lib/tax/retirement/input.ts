/** 2026년 거주자의 일반 퇴직금 일시금 수령. 금액은 비과세를 제외한 원 단위. */
export type RetirementInput = {
  amount: number;
  /** 제외기간을 뺀 실제 근속월수. 월 미만은 올려 입력한다. */
  serviceMonths: number;
  isExecutive: boolean;
  monthsBefore2012: number;
  months2012To2019: number;
  monthsFrom2020: number;
  /** 2019년 말부터 소급한 3년(짧으면 해당 기간)의 총급여 연평균 환산액 */
  annualSalary2019: number;
  /** 퇴직일부터 소급한 3년(2020년 이후 근무가 짧으면 해당 기간)의 연평균 */
  annualSalaryAtRetirement: number;
};

export const DEFAULT_RETIREMENT: RetirementInput = {
  amount: 0, serviceMonths: 0, isExecutive: false,
  monthsBefore2012: 0, months2012To2019: 0, monthsFrom2020: 0,
  annualSalary2019: 0, annualSalaryAtRetirement: 0,
};
export const SAMPLE_EMPLOYEE: RetirementInput = { ...DEFAULT_RETIREMENT, amount: 100_000_000, serviceMonths: 120 };
export const SAMPLE_EXECUTIVE: RetirementInput = {
  ...DEFAULT_RETIREMENT, amount: 500_000_000, serviceMonths: 168, isExecutive: true,
  months2012To2019: 96, monthsFrom2020: 72, annualSalary2019: 100_000_000, annualSalaryAtRetirement: 100_000_000,
};

export function validateRetirement(input: RetirementInput): string[] {
  const errors: string[] = [];
  const money = [input.amount, input.annualSalary2019, input.annualSalaryAtRetirement];
  const months = [input.serviceMonths, input.monthsBefore2012, input.months2012To2019, input.monthsFrom2020];
  // 계산 정밀도·입력 실수 방지용 범위이며 세법상 한도가 아니다.
  if (money.some((v) => !Number.isSafeInteger(v) || v < 0 || v > 1_000_000_000_000)) errors.push("금액은 0원 이상 1조원 이하의 정수로 넣어 주세요.");
  if (months.some((v) => !Number.isSafeInteger(v) || v < 0 || v > 1_200) || input.serviceMonths < 1) errors.push("근속월수는 1~1,200개월, 구간별 월수는 0~1,200개월의 정수로 넣어 주세요.");
  if (typeof input.isExecutive !== "boolean") errors.push("임원 여부를 선택해 주세요.");
  if (input.isExecutive) {
    if (input.monthsBefore2012 + input.months2012To2019 + input.monthsFrom2020 !== input.serviceMonths) errors.push("임원 구간별 월수의 합계가 전체 근속월수와 같아야 합니다.");
    if (input.months2012To2019 > 96 || input.monthsFrom2020 > 84 || input.monthsFrom2020 < 1) errors.push("2026년 퇴직 기준으로 2012~2019년은 최대 96개월, 2020년 이후는 1~84개월입니다.");
    if (input.months2012To2019 > 0 && input.annualSalary2019 <= 0) errors.push("2019년 말 기준 연평균 총급여를 넣어 주세요.");
    if (input.annualSalaryAtRetirement <= 0) errors.push("퇴직일 기준 연평균 총급여를 넣어 주세요.");
  }
  return errors;
}
