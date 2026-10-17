"use client";

import { useState } from "react";
import { DIVIDEND_PRESETS } from "@/lib/default-scenario";
import { formatWon } from "@/lib/won";

/** 연 배당액 입력 — 프리셋 0 / 1,000만 / 2,000만 + 직접 입력 (Josh 2026-09-26) */
export function DividendInput({
  value,
  onChange,
  hasFamily,
}: {
  value: number;
  onChange: (won: number) => void;
  hasFamily: boolean;
}) {
  const isPreset = (DIVIDEND_PRESETS as readonly number[]).includes(value);
  const [custom, setCustom] = useState(!isPreset);
  const showCustom = custom || !isPreset;

  return (
    <div className="text-sm">
      <span>연 배당액 {formatWon(value)}</span>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {DIVIDEND_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(p);
            }}
            className={`border px-2 py-1 ${!showCustom && value === p ? "border-ink" : "border-line text-muted"}`}
          >
            {p === 0 ? "0원" : `${(p / 10_000).toLocaleString("ko-KR")}만`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={`border px-2 py-1 ${showCustom ? "border-ink" : "border-line text-muted"}`}
        >
          직접 입력
        </button>
      </div>
      {showCustom && (
        <span className="mt-2 flex items-baseline gap-2 border-b border-ink">
          <input
            type="number"
            className="num w-full bg-transparent py-1 outline-none"
            value={value === 0 ? "" : value / 10_000}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0) * 10_000)}
          />
          <span className="text-xs text-muted">만원</span>
        </span>
      )}
      <dl className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
        <div>
          <dt className="inline text-ink">1천만 원 </dt>
          <dd className="inline">이자·배당이 연 1천만 원을 넘지 않으면 건강보험료 계산에 들어가지 않습니다. 넘으면 전액이 들어갑니다.</dd>
        </div>
        <div>
          <dt className="inline text-ink">2천만 원 </dt>
          <dd className="inline">
            이 금액까지는 배당 세금이 14%(+지방세 1.4%)로 끝납니다. 법인 대표는 급여 외 소득 2천만 원까지 건강보험료가 추가되지 않습니다.
            {hasFamily && " 배우자 등 가족이 주주이면 1인당 2천만 원까지 같은 방식이 적용됩니다."}
          </dd>
        </div>
      </dl>
    </div>
  );
}
