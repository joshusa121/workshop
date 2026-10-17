"use client";

import { TraceValue } from "@/components/corp-conversion/TraceValue";
import { DISCLAIMER } from "@/lib/catalog";
import type { GoodwillInput, GoodwillResult as Result } from "@/lib/tax/goodwill/net-effect";
import { formatWon } from "@/lib/won";
import { GoodwillCharts } from "./GoodwillCharts";

function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-3 text-sm">
      <div>
        <p>{label}</p>
        {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      </div>
      <div className="shrink-0 text-right [&_[role=dialog]]:left-auto [&_[role=dialog]]:right-0">{children}</div>
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{lead}</p>
      <div className="mt-4 border-t border-ink">{children}</div>
    </section>
  );
}

export function GoodwillResult({ input, result }: { input: GoodwillInput; result: Result }) {
  const { valuation, personal, corp, netEffect, cashFlow, verdict, outOfScope } = result;
  const discount = input.discountRate ?? 0;

  return (
    <div>
      {outOfScope && (
        <p className="mb-8 border border-accent px-4 py-3 text-sm leading-relaxed text-accent">
          부동산을 함께 넘기면 영업권 대금은 기타소득이 아니라 양도소득으로 세금을 매깁니다(소득세법 §94①4호). 아래
          개인 세금 계산은 맞지 않으므로 이 계산기 범위 밖입니다. 3화 양도세 계산기는 주택만 다루므로, 사업장 부동산과 함께 넘기는 경우는 세무사 확인이 필요합니다.
        </p>
      )}

      <div className="border-b border-ink pb-6">
        <p className="text-sm text-muted">결론</p>
        <p className="num mt-2 text-4xl">
          {netEffect.value >= 0 ? "+" : ""}
          {formatWon(netEffect.value)}
        </p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed">
          법인이 5년 동안 아끼는 세금에서 대표가 내는 세금을 뺀 값입니다.{" "}
          <span className={verdict.tone === "positive" ? "text-ok" : "text-accent"}>{verdict.text}</span>
        </p>
      </div>

      {input.equity < 0 && (
        <p className="mb-8 border border-warn px-4 py-3 text-sm leading-relaxed text-warn">
          자기자본이 마이너스입니다(부채가 자산보다 많음). 세법 산식에 그대로 넣어 정상 이익이 음수가 되면서 영업권 평가액이 오히려 커졌습니다. 세무사 확인이 필요합니다.
        </p>
      )}

      <Section
        title="1. 영업권 평가액"
        lead="세법(상속세 및 증여세법)이 정한 공식으로 계산합니다. 최근 3년 이익을 최근 해에 무게를 더 두어 평균낸 뒤, 그 절반에서 자기자본에 대한 정상 이익(10%)을 빼고 남는 '초과 이익'을 5년치로 환산합니다."
      >
        <Row label="최근 3년 이익 가중평균" note="직전 1년 ×3, 2년 ×2, 3년 ×1 ÷ 6">
          <TraceValue t={valuation.weightedAvg} />
        </Row>
        <Row label="초과 이익" note="가중평균 × 50% − 자기자본 × 10%">
          <TraceValue t={valuation.excessProfit} />
        </Row>
        <Row label="영업권 평가액" note={`초과 이익을 5년간 연 10%로 할인해 더한 값 (계수 ${valuation.annuityFactor.toFixed(4)})`}>
          <span className="text-lg">
            <TraceValue t={valuation.goodwill} />
          </span>
        </Row>
      </Section>

      <Section title="그림으로 보기" lead="평가액이 나오는 과정과 5년 절세 흐름을 그림으로 봅니다.">
        <div className="py-6">
          <GoodwillCharts input={input} result={result} />
        </div>
      </Section>

      <Section
        title="2. 대표가 내는 세금"
        lead="영업권을 판 돈은 '기타소득'입니다. 받은 돈의 60%는 비용(필요경비)으로 인정되어 40%에만 세금이 붙습니다. 법인이 대금을 줄 때 20%(지방세 포함 22%)를 미리 떼고, 다음 해 5월 종합소득세 신고에서 다른 소득과 합산해 정산합니다."
      >
        <Row label="양도대가" note="평가액과 같다고 봅니다">
          <TraceValue t={personal.grossReceipt} />
        </Row>
        <Row label="비용으로 인정되는 금액 (필요경비 60%)">
          <TraceValue t={personal.necessaryExpense} />
        </Row>
        <Row label="세금이 붙는 금액 (기타소득금액)">
          <TraceValue t={personal.otherIncomeAmount} />
        </Row>
        <Row label="미리 떼는 세금 (원천징수)" note="법인이 대금 지급 시 공제해 납부">
          <TraceValue t={personal.withholding} />
        </Row>
        <Row
          label="합산 신고 때 늘어나는 세금"
          note={
            personal.separateTaxEligible
              ? "기타소득금액 300만원 이하라 원천징수로 끝낼 수도 있습니다"
              : `다른 소득 ${formatWon(input.otherComprehensiveIncome)}과 합산한 결과`
          }
        >
          <TraceValue t={personal.comprehensiveExtra} />
        </Row>
        <Row
          label="대표의 최종 세금"
          note={
            personal.settlement > 0
              ? `5월 신고 때 ${formatWon(personal.settlement)} 추가 납부`
              : personal.settlement < 0
                ? `5월 신고 때 ${formatWon(-personal.settlement)} 환급`
                : undefined
          }
        >
          <span className="text-lg">
            <TraceValue t={personal.personalTax} />
          </span>
        </Row>
      </Section>

      <Section
        title="3. 법인이 아끼는 세금"
        lead="법인은 사들인 영업권을 5년에 나눠 비용으로 처리합니다(정액법). 그만큼 이익이 줄어 법인세가 줄어듭니다. 절세액은 법인의 이익 구간(2억 이하 10%, 초과 20%)에 따라 달라집니다."
      >
        <Row label="해마다 비용으로 처리하는 금액" note="평가액 ÷ 5년">
          <TraceValue t={corp.annualAmortization} />
        </Row>
        <Row label="해마다 줄어드는 법인세" note="법인세 + 지방소득세, 상각 전후 차액">
          <TraceValue t={corp.annualSaving} />
        </Row>
        <Row label="5년 합계">
          <span className="text-lg">
            <TraceValue t={corp.fiveYearNominal} />
          </span>
        </Row>
        {discount > 0 && (
          <Row label={`5년 합계를 오늘 가치로 (할인율 ${Math.round(discount * 100)}%)`}>
            <TraceValue t={corp.fiveYearPresent} />
          </Row>
        )}
      </Section>

      <Section
        title="4. 순효과"
        lead="법인이 5년간 아끼는 세금(합계)에서 대표가 내는 세금을 뺍니다. 0보다 크면 세금만 놓고 볼 때 영업권 양도가 유리한 방향입니다."
      >
        <Row label="법인 5년 절세">
          <TraceValue t={corp.fiveYearNominal} />
        </Row>
        <Row label="대표 세금">
          <span>− <TraceValue t={personal.personalTax} /></span>
        </Row>
        <Row label="순효과">
          <span className="text-lg">
            <TraceValue t={netEffect} />
          </span>
        </Row>
      </Section>

      <Section
        title="5. 돈의 흐름"
        lead="영업권 대금은 서류상 숫자가 아니라 법인이 대표에게 실제로 줘야 하는 현금입니다. 법인에 그만한 돈이 없으면 미지급금으로 남고, 오래 두면 별도 세무 문제가 생깁니다."
      >
        <Row label="법인에서 나가는 돈" note="영업권 양도대금">
          <TraceValue t={cashFlow.corpOutflow} />
        </Row>
        <Row label="대표에게 들어오는 돈" note="대금 − 미리 떼는 세금">
          <TraceValue t={cashFlow.ownerInflow} />
        </Row>
      </Section>

      <section className="mt-10 text-sm leading-relaxed">
        <h2 className="text-xl">전제와 미반영</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>양도대가는 세법 평가액과 같다고 봅니다. 평가액보다 비싸게 넘기면 그 초과분은 대표에 대한 상여 등으로 과세될 위험이 있습니다.</li>
          <li>개인사업자 시절 3년 이익을 그대로 쓰려면 현물출자 또는 세법상 사업양수도 방식으로 전환하고, 법인이 영업권을 계속 쓰며, 개인·법인 영업 기간 합계가 3년 이상이어야 합니다(상증법 시행령 §55③2호). 이 조건은 충족한 것으로 가정했습니다.</li>
          <li>입력한 순이익은 개인사업자의 사업소득금액을 세법상 「순손익액」 대신 쓴 것입니다. 세무조정 항목에 따라 달라질 수 있습니다.</li>
          <li>대표 세금은 본인 기본공제만 반영해 합산 전후 차액으로 계산했습니다. 다른 소득공제·세액공제는 넣지 않았습니다.</li>
          <li>법인 이익은 5년간 같다고 보았고, 첫해 월할 상각과 지난해까지 쌓인 적자(이월결손금)는 반영하지 않았습니다.</li>
          <li>법인이 해마다 영업권 상각액을 장부에 비용으로 잡아야 법인세가 줄어듭니다. 장부에 잡지 않은 해의 상각액은 인정되지 않습니다.</li>
          <li>건강보험료(기타소득 반영), 부가가치세(포괄양수도 여부), 실제로 든 비용이 받은 돈의 60%를 넘는 경우는 반영하지 않았습니다.</li>
          <li>영업권 존재 자체를 과세관청이 다툴 수 있습니다(권리금 실체, 평가 근거). 계약서·평가서 준비는 세무사와 상의합니다.</li>
        </ul>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
