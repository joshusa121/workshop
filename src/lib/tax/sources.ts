/** 계산 근거 — 법령값·공식자료·가정을 타입으로 구분한다 */
export type Basis =
  | {
      kind: "law";
      law: string;
      article: string;
      url: string;
      effectiveFrom: string;
      appliesTo: string;
      sunset?: string;
      confirmedAt: string;
    }
  | { kind: "official"; source: string; url: string; confirmedAt: string }
  | { kind: "assumption"; description: string; editable: true };

export const RATES_VERSION = "2026-4"; // rates.ts 값 변경 시 반드시 올린다 (공유 URL 무결성). 2026-4: R1~R4(개인지방소득세·지역건보료 필요경비·최적 급여 축·가족 고용·산재) + rates.ts 고용·산재 요율 추가

/**
 * 개인지방소득세는 산출세액이 아니라 결정세액의 10%.
 * 지방세특례제한법 §167의2①: 소득세가 세액공제·감면되는 경우 그 금액의 10%를 개인지방소득세에서도 공제·감면
 * → (산출세액 − 세액공제·감면액) × 10% = 결정세액 × 10%. (Josh 2026-09-26 확정)
 */
export const LOCAL_TAX_DETERMINED_BASIS: Basis = {
  kind: "law",
  law: "지방세특례제한법",
  article: "제167조의2 제1항",
  url: "https://www.law.go.kr/법령/지방세특례제한법/제167조의2",
  effectiveFrom: "2014-01-01",
  appliesTo:
    "소득세 세액공제·감면액의 100분의 10을 개인지방소득세에서 공제·감면 → 개인지방소득세 = 결정세액 × 10%. 부칙에 따라 2026-12-31까지 적용",
  sunset: "2026-12-31",
  confirmedAt: "2026-09-26",
};
