"use client";

import { useState } from "react";
import type { AssetKind, CgtInput, OtherHolding, Redevelopment, SpecialCase } from "@/lib/tax/cgt/input";
import { ADJUSTED_ZONES, SURCHARGE_GRACE } from "@/lib/tax/cgt/rates-cgt";
import { Check, Choice, DateInput, ManInput } from "./fields";

type Patch = (fn: (prev: CgtInput) => CgtInput) => void;

const KIND_LABEL: Record<AssetKind, string> = { house: "주택", right: "조합원입주권", presale: "분양권" };

export function StepSubject({ input, update }: { input: CgtInput; update: Patch }) {
  const s = input.subject;
  const set = (partial: Partial<CgtInput["subject"]>) => update((p) => ({ ...p, subject: { ...p.subject, ...partial } }));
  const years = Math.floor(s.residenceMonths / 12);
  const months = s.residenceMonths % 12;
  const zones = ADJUSTED_ZONES.value;

  return (
    <div className="space-y-5">
      <Choice<AssetKind>
        legend="무엇을 파나요"
        value={s.kind}
        onChange={(kind) =>
          update((p) => ({
            ...p,
            subject: { ...p.subject, kind },
            redevelopment:
              kind === "right" && !p.redevelopment
                ? { role: "original", approvalDate: "", appraisal: 0, settlement: { type: "received", amount: 0 }, transferAsNewHouse: false }
                : p.redevelopment,
          }))
        }
        options={[
          { value: "house", label: "주택", hint: "아파트·빌라·단독주택. 재건축으로 받은 새 아파트도 여기입니다." },
          { value: "right", label: "조합원입주권", hint: "재건축·재개발 관리처분인가 뒤 새 아파트를 받을 권리입니다." },
          { value: "presale", label: "분양권", hint: "청약·분양계약으로 새 아파트를 받을 권리입니다." },
        ]}
      />
      <div className="grid grid-cols-2 gap-4">
        <DateInput
          label="산 날"
          hint={s.kind === "right" ? "원조합원은 기존 집을 산 날" : "잔금을 치른 날"}
          value={s.acquiredAt}
          onChange={(acquiredAt) => set({ acquiredAt })}
        />
        <DateInput label="판 날" hint="잔금을 받는 날" value={s.transferredAt} onChange={(transferredAt) => set({ transferredAt })} />
      </div>
      <p className="-mt-2 text-xs leading-relaxed text-muted">
        잔금 전에 등기를 넘겼다면 등기 접수일이 기준입니다. 상속받은 집은 상속이 시작된 날입니다.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <ManInput
          label="산 값"
          hint="취득세·중개수수료 포함"
          value={s.acquisitionPrice}
          onChange={(acquisitionPrice) => set({ acquisitionPrice })}
        />
        <ManInput label="판 값" hint="계약서의 실제 금액" value={s.transferPrice} onChange={(transferPrice) => set({ transferPrice })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ManInput
          label="집값을 높인 공사비"
          hint="샷시·확장 등, 증빙이 있는 것만"
          value={s.capitalExpenditure}
          onChange={(capitalExpenditure) => set({ capitalExpenditure })}
        />
        <ManInput
          label="팔 때 든 비용"
          hint="중개수수료·신고 대행료"
          value={s.transferCost}
          onChange={(transferCost) => set({ transferCost })}
        />
      </div>
      {s.kind !== "presale" && (
        <fieldset>
          <legend className="text-sm">
            이 집에 실제로 산 기간
            <span className="mt-0.5 block text-xs leading-relaxed text-muted">
              주민등록 전입일부터 전출일까지입니다. 여러 번 살았다면 합칩니다.
            </span>
          </legend>
          <div className="mt-1 grid grid-cols-2 gap-4">
            {[
              { unit: "년", v: years, to: (n: number) => n * 12 + months },
              { unit: "개월", v: months, to: (n: number) => years * 12 + Math.min(11, n) },
            ].map((f) => (
              <label key={f.unit} className="flex items-baseline gap-2 border-b border-ink focus-within:border-accent">
                <input
                  type="number"
                  min={0}
                  aria-label={`거주 ${f.unit}`}
                  className="num w-full min-w-0 bg-transparent py-2 outline-none"
                  value={f.v === 0 ? "" : f.v}
                  onChange={(e) => set({ residenceMonths: f.to(Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
                />
                <span className="text-xs text-muted">{f.unit}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Check
        checked={s.adjustedAtAcquisition}
        onChange={(adjustedAtAcquisition) => set({ adjustedAtAcquisition })}
        hint="그랬다면 비과세를 받으려면 2년 이상 살아야 합니다. 산 날 기준 지정 여부는 직접 확인해 주세요."
      >
        살 때 조정대상지역이었습니다
      </Check>
      <Check
        checked={s.adjustedAtTransfer}
        onChange={(adjustedAtTransfer) => set({ adjustedAtTransfer })}
        hint="집이 여러 채면 중과 여부가 여기서 갈립니다."
      >
        팔 때 조정대상지역입니다
      </Check>
      <details className="text-xs leading-relaxed text-muted">
        <summary className="cursor-pointer underline underline-offset-4">지금 조정대상지역은 어디인가요</summary>
        <p className="mt-2">
          서울 전 지역과 경기 {zones.sigungu.map((z) => z.replace("경기 ", "")).join(", ")}입니다. 국토교통부 공고
          제2026-882호(2026년 7월 1일) 기준이고 2026년 9월 26일에 확인했습니다. 이후 지정·해제가 있으면 직접 고쳐 주세요.
        </p>
      </details>
      <Check checked={!s.registered} onChange={(v) => set({ registered: !v })} hint="세율 70%, 공제가 모두 빠집니다.">
        등기하지 않은 채로 팝니다
      </Check>
    </div>
  );
}

export function StepHousehold({ input, update }: { input: CgtInput; update: Patch }) {
  const { others, special } = input.household;
  const s = input.subject;
  const setHousehold = (partial: Partial<CgtInput["household"]>) =>
    update((p) => ({ ...p, household: { ...p.household, ...partial } }));
  const setOther = (i: number, partial: Partial<OtherHolding>) =>
    setHousehold({ others: others.map((o, j) => (j === i ? { ...o, ...partial } : o)) });
  const showTransitional = s.adjustedAtTransfer && s.transferredAt > SURCHARGE_GRACE.value.lastTransferDate && others.length > 0;
  const tr = input.transitional;
  const setTr = (partial: Partial<NonNullable<CgtInput["transitional"]>>) =>
    update((p) => ({
      ...p,
      transitional: { contractDate: "", landPermit: false, sixMonthRegion: false, ...p.transitional, ...partial },
    }));

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed">
        판 날에 세대가 가진 다른 집과 입주권·분양권을 적습니다. 세대는 나와 배우자, 같은 집에 살며 생계를 같이하는
        부모·자녀까지입니다.
      </p>
      {others.length === 0 && <p className="text-sm text-muted">다른 집이 없으면 비워 둡니다.</p>}
      <ul className="space-y-5">
        {others.map((o, i) => (
          <li key={i} className="space-y-3 border-l border-ink pl-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm">다른 집 {i + 1}</span>
              <button
                type="button"
                className="text-xs text-muted underline underline-offset-4"
                onClick={() => setHousehold({ others: others.filter((_, j) => j !== i), special: others.length === 2 ? special : { type: "none" } })}
              >
                빼기
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                종류
                <select
                  className="mt-1 w-full border-0 border-b border-ink bg-transparent py-2"
                  value={o.kind}
                  onChange={(e) => setOther(i, { kind: e.target.value as AssetKind })}
                >
                  {(Object.keys(KIND_LABEL) as AssetKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              <DateInput label="산 날" value={o.acquiredAt} onChange={(acquiredAt) => setOther(i, { acquiredAt })} />
            </div>
            {o.kind === "presale" && (
              <p className="text-xs leading-relaxed text-muted">2021년 1월 1일 전에 산 분양권은 집 수에 넣지 않습니다.</p>
            )}
            <Check checked={o.inherited === true} onChange={(v) => setOther(i, { inherited: v || undefined })}>
              상속받았습니다
            </Check>
            <Check
              checked={o.nonMetroLowValue === true}
              onChange={(v) => setOther(i, { nonMetroLowValue: v || undefined })}
              hint="수도권·광역시·세종시 밖이고 기준시가 3억원 이하면 중과를 따질 때 집 수에서 뺍니다."
            >
              지방 저가 주택입니다
            </Check>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setHousehold({ others: [...others, { kind: "house", acquiredAt: "" }] })}
        className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas"
      >
        다른 집 추가
      </button>

      {others.length === 1 && s.kind === "house" && (
        <SpecialPicker special={special} onChange={(sp) => setHousehold({ special: sp })} />
      )}

      {showTransitional && (
        <fieldset className="space-y-3 border-t border-line pt-5">
          <legend className="text-sm">중과 유예 경과조치</legend>
          <p className="text-xs leading-relaxed text-muted">
            다주택 중과 유예는 2026년 5월 9일 양도분까지였습니다. 그 전에 계약했다면 정해진 기한 안에 잔금을 받는 경우
            중과하지 않습니다.
          </p>
          <Check
            checked={!!tr}
            onChange={(v) =>
              update((p) => (v ? { ...p, transitional: { contractDate: "", landPermit: false, sixMonthRegion: false } } : { ...p, transitional: undefined }))
            }
          >
            2026년 5월 9일 전에 매매계약을 하고 계약금을 받았습니다
          </Check>
          {tr && (
            <div className="space-y-3">
              <DateInput label="계약일" value={tr.contractDate} onChange={(contractDate) => setTr({ contractDate })} />
              <Check checked={tr.landPermit} onChange={(landPermit) => setTr({ landPermit })}>
                토지거래허가를 받아야 하는 집입니다
              </Check>
              {tr.landPermit && (
                <DateInput
                  label="토지거래허가 신청일"
                  hint="2026년 5월 9일까지 신청했어야 합니다. 허가는 받은 것으로 봅니다."
                  value={tr.permitAppliedAt ?? ""}
                  onChange={(permitAppliedAt) => setTr({ permitAppliedAt })}
                />
              )}
              <Check
                checked={tr.sixMonthRegion}
                onChange={(sixMonthRegion) => setTr({ sixMonthRegion })}
                hint="이 지역이면 기한이 계약일부터 6개월, 아니면 4개월입니다."
              >
                6개월 지역입니다
              </Check>
              <details className="text-xs leading-relaxed text-muted">
                <summary className="cursor-pointer underline underline-offset-4">6개월 지역 보기</summary>
                <p className="mt-2">{SURCHARGE_GRACE.value.sixMonthRegions.join(", ")}</p>
              </details>
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}

function SpecialPicker({ special, onChange }: { special: SpecialCase; onChange: (sp: SpecialCase) => void }) {
  const eventDate = special.type === "marriage" || special.type === "cohabitation" ? special.eventDate : "";
  return (
    <div className="space-y-3 border-t border-line pt-5">
      <Choice<SpecialCase["type"]>
        legend="두 채가 된 이유"
        value={special.type}
        onChange={(type) =>
          onChange(type === "marriage" || type === "cohabitation" ? { type, eventDate } : { type } as SpecialCase)
        }
        options={[
          { value: "none", label: "해당 없음" },
          { value: "temporary", label: "이사하려고 새 집을 먼저 샀습니다", hint: "일시적 2주택. 새 집을 산 날부터 3년 안에 이 집을 팔아야 합니다." },
          { value: "inherited", label: "다른 한 채는 상속받은 집입니다", hint: "상속 전부터 가진 이 집을 팔 때 적용됩니다." },
          { value: "marriage", label: "결혼하면서 두 채가 됐습니다", hint: "혼인한 날부터 10년 안에 먼저 파는 집." },
          { value: "cohabitation", label: "60세 이상 부모님과 합치면서 두 채가 됐습니다", hint: "합친 날부터 10년 안에 먼저 파는 집." },
        ]}
      />
      {(special.type === "marriage" || special.type === "cohabitation") && (
        <DateInput
          label={special.type === "marriage" ? "혼인신고일" : "세대를 합친 날"}
          value={eventDate}
          onChange={(d) => onChange({ type: special.type, eventDate: d } as SpecialCase)}
        />
      )}
    </div>
  );
}

export function StepRedevelopment({ input, update }: { input: CgtInput; update: Patch }) {
  const rd = input.redevelopment;
  const setRd = (partial: Partial<Redevelopment>) =>
    update((p) => (p.redevelopment ? { ...p, redevelopment: { ...p.redevelopment, ...partial } } : p));
  const isRight = input.subject.kind === "right";
  const [settleMode, setSettleMode] = useState<"none" | "paid" | "received">(
    rd && rd.settlement.amount > 0 ? rd.settlement.type : "none",
  );

  return (
    <div className="space-y-5">
      <Check
        checked={!!rd}
        onChange={(v) =>
          update((p) => ({
            ...p,
            redevelopment: v
              ? { role: "original", approvalDate: "", appraisal: 0, settlement: { type: "received", amount: 0 }, transferAsNewHouse: p.subject.kind === "house" }
              : undefined,
          }))
        }
        hint={isRight ? "조합원입주권이면 이 단계를 채워야 계산됩니다." : undefined}
      >
        재건축·재개발로 받은 입주권이나 새 아파트입니다
      </Check>
      {!rd && !isRight && <p className="text-sm text-muted">해당하지 않으면 이 단계는 건너뜁니다.</p>}
      {rd && (
        <div className="space-y-5">
          <Choice<Redevelopment["role"]>
            legend="조합원 구분"
            value={rd.role}
            onChange={(role) => setRd({ role })}
            options={[
              { value: "original", label: "원래 집을 조합에 낸 조합원", hint: "원조합원. 기존 집을 산 날부터 기간을 셉니다." },
              { value: "successor", label: "관리처분인가 뒤에 입주권을 산 사람", hint: "승계조합원. 비과세·오래 가진 공제가 제한됩니다." },
            ]}
          />
          <DateInput label="관리처분계획인가일" value={rd.approvalDate} onChange={(approvalDate) => setRd({ approvalDate })} />
          {rd.role === "original" && (
            <>
              <ManInput
                label="기존 집 평가액"
                hint="관리처분계획에 적힌 종전자산 평가액"
                value={rd.appraisal}
                onChange={(appraisal) => setRd({ appraisal })}
              />
              <Choice<"none" | "paid" | "received">
                legend="청산금"
                value={settleMode}
                onChange={(t) => {
                  setSettleMode(t);
                  setRd({ settlement: t === "none" ? { type: "received", amount: 0 } : { type: t, amount: rd.settlement.amount } });
                }}
                options={[
                  { value: "none", label: "없음" },
                  { value: "paid", label: "추가로 냈습니다", hint: "새 아파트가 기존 집 평가액보다 비싸서 더 낸 돈" },
                  { value: "received", label: "돌려받았습니다", hint: "기존 집 평가액이 더 커서 받은 돈" },
                ]}
              />
              {settleMode !== "none" && (
                <ManInput
                  label={settleMode === "paid" ? "낸 청산금" : "받은 청산금"}
                  value={rd.settlement.amount}
                  onChange={(amount) => setRd({ settlement: { ...rd.settlement, amount } })}
                />
              )}
            </>
          )}
          <Check
            checked={rd.transferAsNewHouse}
            onChange={(transferAsNewHouse) =>
              update((p) => ({
                ...p,
                subject: { ...p.subject, kind: transferAsNewHouse ? "house" : "right" },
                redevelopment: p.redevelopment ? { ...p.redevelopment, transferAsNewHouse } : p.redevelopment,
              }))
            }
          >
            완공된 뒤 새 아파트로 팝니다
          </Check>
          {rd.transferAsNewHouse && (
            <DateInput
              label="새 아파트 사용승인일"
              hint={rd.role === "successor" ? "승계조합원은 이 날부터 보유기간을 셉니다." : undefined}
              value={rd.completionDate ?? ""}
              onChange={(completionDate) => setRd({ completionDate })}
            />
          )}
        </div>
      )}
    </div>
  );
}
