import { CGT_RATES_VERSION } from "./tax/cgt/version";
import { COMP_INCOME_RATES_VERSION } from "./tax/comp-income/version";
import { FINANCIAL_RATES_VERSION } from "./tax/financial/version";
import { FUNDS_SOURCE_RATES_VERSION } from "./tax/funds-source/version";
import { GIFT_INHERITANCE_RATES_VERSION } from "./tax/gift-inheritance/version";
import { GOODWILL_RATES_VERSION } from "./tax/goodwill/facts";
import { LOAN_TO_OWNER_RATES_VERSION } from "./tax/loan-to-owner/version";
import { RENTAL_RATES_VERSION } from "./tax/rental-entity/version";
import { RETIREMENT_RATES_VERSION } from "./tax/retirement/version";
import { SINCERE_VERSION } from "./tax/sincere-filing/version";
import { RATES_VERSION } from "./tax/sources";
import { STARTUP_RELIEF_RATES_VERSION } from "./tax/startup-relief/version";
import { VAT_RATES_VERSION } from "./tax/vat/version";
import { HOUSING_RATES_VERSION } from "./tax/housing-tax/version";
import { FAMILY_SUCCESSION_RATES_VERSION } from "./tax/family-succession/version";
import { AUDIT_RISK_RATES_VERSION } from "./tax/audit-risk/version";
import { EXPENSE_VERSION } from "./tax/expense-check/version";
import { FAMILY_PAYROLL_VERSION } from "./tax/family-payroll/version";
import { CALENDAR_VERSION } from "./tax/tax-calendar/version";
import { CHECKLIST_VERSION } from "./tax/filing-checklist/version";
import { WITHHOLDING_RATES_VERSION } from "./tax/withholding/version";

export const SITE_NAME = "작업실";

export const PRODUCTS = [
  {
    slug: "corp-conversion",
    href: "/tools/corp-conversion",
    number: 1,
    name: "법인전환 시뮬레이터",
    blurb: "개인으로 남을 때와 법인으로 바꿀 때, 손에 남는 돈과 회사에 남는 이익을 나눠 비교합니다.",
    madeAt: "2026-09-02",
    version: "0.1",
    ratesVersion: RATES_VERSION,
  },
  {
    slug: "goodwill",
    href: "/tools/goodwill",
    number: 2,
    name: "영업권 계산기",
    blurb: "가게의 단골·평판·노하우 값을 법인에 팔 때, 세법이 인정하는 가격과 양쪽 세금을 계산합니다.",
    madeAt: "2026-09-26",
    version: "0.1",
    ratesVersion: GOODWILL_RATES_VERSION,
  },
  {
    slug: "capital-gains",
    href: "/tools/capital-gains",
    number: 3,
    name: "주택 양도세 계산기",
    blurb: "집을 팔 때 비과세인지, 세금이 얼마인지, 다주택 중과 대상인지 날짜와 근거 조문으로 판정합니다.",
    madeAt: "2026-09-26",
    version: "0.1",
    ratesVersion: CGT_RATES_VERSION,
  },
  {
    slug: "comprehensive-income",
    href: "/tools/comprehensive-income",
    number: 4,
    name: "종합소득세 예상 계산기",
    blurb: "프리랜서·사업자가 5월에 낼 종합소득세를, 이미 뗀 3.3% 원천징수까지 반영해 미리 계산합니다.",
    madeAt: "2026-10-16",
    version: "0.1",
    ratesVersion: COMP_INCOME_RATES_VERSION,
  },
  {
    slug: "vat",
    href: "/tools/vat",
    number: 5,
    name: "부가가치세 계산기",
    blurb: "같은 매출·매입으로 간이과세와 일반과세의 부가가치세를 나란히 비교하고, 간이과세 요건과 납부면제 여부를 판정합니다.",
    madeAt: "2026-10-16",
    version: "0.1",
    ratesVersion: VAT_RATES_VERSION,
  },
  {
    slug: "funds-source",
    href: "/tools/funds-source",
    number: 6,
    name: "자금출처 셀프 진단",
    blurb: "집·땅 취득자금이 어디서 왔는지 스스로 점검하고, 소명 부족액과 증여추정 배제 기준을 상증세법으로 진단합니다.",
    madeAt: "2026-10-16",
    version: "0.1",
    ratesVersion: FUNDS_SOURCE_RATES_VERSION,
  },
  {
    slug: "gift-inheritance",
    href: "/tools/gift-inheritance",
    number: 7,
    name: "증여 vs 상속 시뮬레이터",
    blurb: "재산을 지금 증여할 때, 사후 상속할 때, 10년 간격으로 나눠 증여할 때의 세금을 비교합니다.",
    madeAt: "2026-10-16",
    version: "0.1",
    ratesVersion: GIFT_INHERITANCE_RATES_VERSION,
  },
  {
    slug: "financial",
    href: "/tools/financial",
    number: 8,
    name: "금융투자 세금 계산기",
    blurb: "이자·배당 2천만원 종합과세 진단과 대주주 주식 양도세를 한 번에 계산합니다.",
    madeAt: "2026-10-16",
    version: "0.1",
    ratesVersion: FINANCIAL_RATES_VERSION,
  },
  {
    slug: "retirement",
    href: "/tools/retirement",
    number: 9,
    name: "퇴직소득세 계산기",
    blurb: "퇴직금에 붙는 세금을 근속연수·환산급여 공제와 임원 한도까지 근거 조문으로 계산합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: RETIREMENT_RATES_VERSION,
  },
  {
    slug: "rental-entity",
    href: "/tools/rental-entity",
    number: 10,
    name: "부동산 임대 개인 vs 법인",
    blurb: "같은 임대소득을 개인사업자와 법인 중 어느 쪽으로 받을 때 세금이 적은지 비교합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: RENTAL_RATES_VERSION,
  },
  {
    slug: "loan-to-owner",
    href: "/tools/loan-to-owner",
    number: 11,
    name: "법인 가지급금 진단",
    blurb: "대표가 회사 돈을 개인적으로 가져간 가지급금의 인정이자와 과세 리스크를 진단합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: LOAN_TO_OWNER_RATES_VERSION,
  },
  {
    slug: "startup-relief",
    href: "/tools/startup-relief",
    number: 12,
    name: "창업중소기업 감면 판정",
    blurb: "창업일·지역·청년 요건으로 창업중소기업 세액감면 대상과 감면액을 판정합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: STARTUP_RELIEF_RATES_VERSION,
  },
  {
    slug: "sincere-filing",
    href: "/tools/sincere-filing",
    number: 13,
    name: "성실신고확인대상 판정",
    blurb: "업종별 수입금액으로 성실신고확인·복식부기 의무 해당 여부와 신고기한을 판정합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: SINCERE_VERSION,
  },
  {
    slug: "housing-tax",
    href: "/tools/housing-tax",
    number: 14,
    name: "주택 세금 통합 계산기",
    blurb: "집을 살 때(취득세)·가질 때(재산세·종부세)·팔 때(양도세)의 세금을 한 화면에서 정리합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: HOUSING_RATES_VERSION,
  },
  {
    slug: "family-succession",
    href: "/tools/family-succession",
    number: 15,
    name: "가업승계 공제 판정",
    blurb: "가업상속공제·가업승계 증여특례 요건 충족 여부와 공제 한도를 판정합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: FAMILY_SUCCESSION_RATES_VERSION,
  },
  {
    slug: "audit-risk",
    href: "/tools/audit-risk",
    number: 16,
    name: "세무조사 리스크 체크",
    blurb: "현금수입 비중·가공경비·가지급금 등 지표로 세무조사·세무검증 리스크를 점검합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: AUDIT_RISK_RATES_VERSION,
  },
  {
    slug: "expense-check",
    href: "/tools/expense-check",
    number: 17,
    name: "경비처리 판정",
    blurb: "접대비·업무용승용차·감가상각 등 지출이 비용으로 인정되는 한도를 판정합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: EXPENSE_VERSION,
  },
  {
    slug: "family-payroll",
    href: "/tools/family-payroll",
    number: 18,
    name: "가족 고용 절세 판정",
    blurb: "배우자·자녀 급여를 비용 처리할 때의 요건과 절약액을 판정합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: FAMILY_PAYROLL_VERSION,
  },
  {
    slug: "tax-calendar",
    href: "/tools/tax-calendar",
    number: 19,
    name: "절세 캘린더",
    blurb: "부가세·종소세·재산세·종부세 등 연간 신고·납부 일정을 날짜로 정리합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: CALENDAR_VERSION,
  },
  {
    slug: "filing-checklist",
    href: "/tools/filing-checklist",
    number: 20,
    name: "신고 서류 체크리스트",
    blurb: "종합소득세 신고 유형별로 준비해야 할 서류를 체크리스트로 만들어 줍니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: CHECKLIST_VERSION,
  },
  {
    slug: "withholding",
    href: "/tools/withholding",
    number: 21,
    name: "원천세 계산기",
    blurb: "사업소득·기타소득·이자·배당을 지급할 때 떼는 원천세를 계산합니다.",
    madeAt: "2026-10-17",
    version: "0.1",
    ratesVersion: WITHHOLDING_RATES_VERSION,
  },
] as const;

export const DISCLAIMER =
  "본 계산은 참고용 시뮬레이션이며 세무 자문이 아닙니다. 개별 사안은 반드시 세무사 확인이 필요합니다.";
