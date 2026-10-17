/**
 * 3화 주택 양도세 계산기 공유 링크의 세율 버전. 1화 RATES_VERSION과 분리(Josh 2026-09-26) — 1화 세율만 바뀌어도
 * 이 제품 링크에 「세법 개정」 배너가 뜨지 않게 한다. rates-cgt.ts의 값이나 1화와 공유하는
 * INCOME_TAX_BRACKETS·LOCAL_TAX_RATE가 바뀌면 올린다. 올리는 것을 잊으면 __tests__/rates-version-guard.test.ts 가 실패한다.
 */
export const CGT_RATES_VERSION = "2026-3";
