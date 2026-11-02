"use client";

import { DISCLAIMER } from "@/lib/catalog";
import type { GiftInheritanceResult as Result, Scenario } from "@/lib/tax/gift-inheritance/engine";
import { BENEFICIARY_LABEL, type GiftInheritanceInput } from "@/lib/tax/gift-inheritance/input";
import { formatWon } from "@/lib/won";

const NOT_COVERED = [
  "500만원을 넘는 실제 장례비(1천만원까지)와 봉안·자연장지 비용(500만원까지)",
  "10년 이내 사전증여 합산과세(§13)",
  "부동산 시가·감정평가, 금융재산·동거주택·가업상속 공제",
  "신고세액공제, 연부연납, 물납",
  "배우자 법정상속분·실제 상속액에 따른 배우자공제 정밀 계산",
  "혼인·출산 증여재산 공제(§53의2)",
];

function ScenarioCard({ s, best }: { s: Scenario; best: boolean }) {
  return (
    <div className={`border p-4 ${best ? "border-ink" : "border-line"}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-sm">{s.label}</p>
        {best && <span className="bg-ink px-1.5 py-0.5 text-[10px] text-canvas">유리</span>}
      </div>
      <p className="num mt-3 text-2xl">{formatWon(s.total)}</p>
      <ul className="mt-3 space-y-1 text-xs text-muted">
        {s.giftTax.value > 0 && <li>증여세 {formatWon(s.giftTax.value)}</li>}
        {s.inheritanceTax.value > 0 && <li>상속세 {formatWon(s.inheritanceTax.value)}</li>}
        {s.total === 0 && <li>세금 없음</li>}
        {s.detail.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  );
}

export function GiftInheritanceResult({ input, result: r }: { input: GiftInheritanceInput; result: Result }) {
  const winner = [r.inherit, r.giftAll, r.split].find((s) => s.key === r.recommend)!;
  const gap = Math.max(r.inherit.total, r.giftAll.total, r.split.total) - winner.total;

  return (
    <div>
      <div className="border-b border-ink pb-6">
        <p className="text-sm text-muted">
          {formatWon(input.assets)} · {BENEFICIARY_LABEL[input.beneficiary]}에게 이전
        </p>
        <p className="mt-2 text-2xl text-ok">{winner.label}이 가장 유리합니다</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed">
          세금이 가장 적은 방법은 <b>{winner.label}</b>이고 총 세금은 {formatWon(winner.total)}입니다. 가장 불리한 방법보다{" "}
          {formatWon(gap)} 적습니다.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl">세 가지 방법 비교</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ScenarioCard s={r.inherit} best={r.recommend === "inherit"} />
          <ScenarioCard s={r.giftAll} best={r.recommend === "giftAll"} />
          <ScenarioCard s={r.split} best={r.recommend === "split"} />
        </div>
        {r.savedBySplit > 0 && (
          <p className="mt-4 text-sm text-muted">
            분할 증여를 쓰면 전액 상속보다 {formatWon(r.savedBySplit)} 아낄 수 있습니다(10년 간격으로 공제를 다시 받는 효과).
          </p>
        )}
      </section>

      <section className="mt-12 text-sm leading-relaxed">
        <h2 className="text-xl">전제와 미반영</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="mt-6">이 시뮬레이터가 다루지 않는 것</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          {NOT_COVERED.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
