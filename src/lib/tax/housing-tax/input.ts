/** 개인 거주자·일반주택 단독명의, 합산배제·주택 수 제외 특례 없음. */
export type HousingInput = {
  purchasePrice: number;
  acquisitionHomes: number;
  regulated: boolean;
  temporaryTwo: boolean;
  ruralExempt: boolean;
  homes: { publicValue: number; urban: boolean }[];
  householdSingle: boolean;
  age: number;
  holdingYears: number;
};
export const DEFAULT_INPUT: HousingInput = {
  purchasePrice: 750_000_000, acquisitionHomes: 1, regulated: false, temporaryTwo: false, ruralExempt: true,
  homes: [{ publicValue: 900_000_000, urban: true }], householdSingle: true, age: 45, holdingYears: 3,
};
export function validateInput(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["입력 형식이 올바르지 않습니다."];
  const x = raw as Record<string, unknown>;
  const errors: string[] = [];
  const integer = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max;
  if (!integer(x.purchasePrice, 0, 1_000_000_000_000)) errors.push("취득가액은 0원 이상 1조원 이하의 정수로 입력하세요.");
  if (!integer(x.acquisitionHomes, 1, 10)) errors.push("취득 후 세대 주택 수는 1채 이상 10채 이하로 입력하세요.");
  if (!integer(x.age, 0, 120)) errors.push("과세기준일의 만 나이는 0세 이상 120세 이하의 정수로 입력하세요.");
  if (!integer(x.holdingYears, 0, 100)) errors.push("과세기준일까지 채운 보유연수는 0년 이상 100년 이하의 정수로 입력하세요.");
  for (const key of ["regulated", "temporaryTwo", "ruralExempt", "householdSingle"]) {
    if (typeof x[key] !== "boolean") errors.push("지역과 특례 요건을 선택하세요.");
  }
  if (x.temporaryTwo === true && x.acquisitionHomes !== 2) errors.push("일시적 2주택은 취득 후 주택 수가 2채일 때만 선택하세요.");
  if (!Array.isArray(x.homes) || x.homes.length > 10) errors.push("기준일에 본인이 보유한 주택은 0채부터 10채까지 입력할 수 있습니다.");
  else {
    if (x.householdSingle === true && x.homes.length !== 1) errors.push("1세대 1주택은 보유주택이 1채인 경우에만 선택하세요.");
    x.homes.forEach((h, i) => {
      if (!h || typeof h !== "object" || !integer(h.publicValue, 1, 1_000_000_000_000) || typeof h.urban !== "boolean") errors.push(`보유주택 ${i + 1}: 공시가격은 1원 이상 1조원 이하로, 도시지역분 여부와 함께 입력하세요.`);
    });
  }
  return errors;
}
