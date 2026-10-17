/**
 * 주택 양도소득세 계산기 입력 스키마.
 * 각 필드의 세무상 의미를 주석으로 고정한다 — UI 라벨은 이 의미와 일치해야 한다.
 * 날짜는 "YYYY-MM-DD" 문자열.
 */

/** 양도 자산 종류. 주택 / 조합원입주권(도정법 §74 관리처분인가로 취득한 지위) / 분양권(주택법 등 공급계약 지위) */
export type AssetKind = "house" | "right" | "presale";

/** 세대가 보유한 다른 주택·입주권·분양권 1건 */
export type OtherHolding = {
  kind: AssetKind;
  /** 취득일. 분양권은 2021-01-01 이후 취득분만 주택 수에 산입(법률 17477호 부칙 §4) */
  acquiredAt: string;
  /**
   * 중과 주택 수 계산에서 제외되는 지방 저가 주택 여부 — 수도권·광역시·특별자치시 밖 + 기준시가 3억 이하
   * (시행령 §167의10①1호 등). 사용자가 직접 표시한다. 기본 false.
   */
  nonMetroLowValue?: boolean;
  /** 상속으로 취득한 주택(§155②)·입주권·분양권 여부 */
  inherited?: boolean;
};

/** 1세대 1주택 특례 사유 (시행령 §155 ①②④⑤). 하나만 선택 */
export type SpecialCase =
  | { type: "none" }
  /** 일시적 2주택: 신규주택 취득일은 otherHoldings[0].acquiredAt 사용 */
  | { type: "temporary" }
  /** 상속주택 특례: 양도 주택이 일반주택(상속개시 당시 보유)이고 다른 1채가 상속주택 */
  | { type: "inherited" }
  /** 혼인 합가: 혼인일부터 10년 이내 먼저 양도 */
  | { type: "marriage"; eventDate: string }
  /** 동거봉양 합가(60세 이상 직계존속): 합가일부터 10년 이내 먼저 양도 */
  | { type: "cohabitation"; eventDate: string };

/** 재건축·재개발 (원조합원 = 관리처분 전부터 보유). 시행령 §166 */
export type Redevelopment = {
  /** original: 기존주택을 조합에 제공한 조합원 / successor: 관리처분 후 입주권을 매수 */
  role: "original" | "successor";
  /** 관리처분계획인가일 */
  approvalDate: string;
  /** 종전자산 평가액(관리처분계획상 가격) */
  appraisal: number;
  /** 청산금: paid=납부, received=수령. 없으면 amount 0 */
  settlement: { type: "paid" | "received"; amount: number };
  /** 완공 후 신축주택으로 양도하는지(true) / 입주권 상태로 양도하는지(false) */
  transferAsNewHouse: boolean;
  /** 신축주택 사용승인일(완공 후 양도 시) */
  completionDate?: string;
};

export type CgtInput = {
  subject: {
    kind: AssetKind;
    /** 취득일(대금청산일 원칙, §98). 원조합원 입주권·신축주택은 기존주택 취득일 */
    acquiredAt: string;
    /** 양도일(대금청산일 원칙) */
    transferredAt: string;
    /** 취득 실지거래가액(취득세 등 취득 부대비용 포함, 영 §163①) */
    acquisitionPrice: number;
    /** 양도 실지거래가액 */
    transferPrice: number;
    /** 자본적지출(증빙 있는 것, 영 §163③) */
    capitalExpenditure: number;
    /** 양도비(중개수수료·신고서 작성비 등, 영 §163⑤) */
    transferCost: number;
    /** 거주기간(주민등록 전입~전출, 영 §154⑥). 구간 여러 개면 합산해 월 단위로 입력 */
    residenceMonths: number;
    /** 취득 당시 조정대상지역 여부 — 거주 2년 요건(영 §154①). 과거 지정 이력은 사용자 확인 */
    adjustedAtAcquisition: boolean;
    /** 양도 당시 조정대상지역 여부 — 다주택 중과(§104⑦). 현행 목록으로 기본값 제안, 수정 가능 */
    adjustedAtTransfer: boolean;
    /** 등기 여부. false면 미등기양도(70%, 장특·기본공제 배제) */
    registered: boolean;
  };
  household: {
    /** 양도 자산 외에 세대가 보유한 주택·입주권·분양권 */
    others: OtherHolding[];
    special: SpecialCase;
  };
  redevelopment?: Redevelopment;
  /** 중과 유예 경과조치(영 §167의10①12의2 나·다목). 2026-05-10 이후 양도인데 그 전에 계약한 경우만 입력 */
  transitional?: Transitional;
};

/** 중과 유예 경과조치 입력 */
export type Transitional = {
  /** 매매계약 체결·계약금 수령일(증빙으로 확인되는 날) */
  contractDate: string;
  /** 토지거래허가 대상 주택인가(나목) / 아니면 다목 */
  landPermit: boolean;
  /** 토지거래허가 신청일(나목). 허가는 받은 것으로 본다 */
  permitAppliedAt?: string;
  /** 경과조치 표 지역(6개월) 여부. 서울 강남·서초·송파·용산 등 표에 없는 조정대상지역은 4개월 */
  sixMonthRegion: boolean;
};
