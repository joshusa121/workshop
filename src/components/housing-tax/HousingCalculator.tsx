"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DISCLAIMER } from "@/lib/catalog";
import { LINK_ERROR_NEXT } from "@/lib/link-error";
import { formatWon } from "@/lib/won";
import { computeHousing } from "@/lib/tax/housing-tax/engine";
import { DEFAULT_INPUT, validateInput, type HousingInput } from "@/lib/tax/housing-tax/input";
import { decodeHousing, encodeHousing } from "@/lib/tax/housing-tax/share";
import { HOUSING_RATES_VERSION } from "@/lib/tax/housing-tax/version";
import { HousingResult } from "./HousingResult";

const fieldClass = "num mt-2 w-full border border-line bg-paper px-3 py-2 focus:outline-2 focus:outline-offset-2 focus:outline-ink";
export function HousingCalculator() {
  const params = useSearchParams();
  const [initial] = useState(() => params.has("s") ? decodeHousing(params.get("s") ?? "") : null);
  const [input, setInput] = useState<HousingInput>(initial?.ok ? initial.input : DEFAULT_INPUT);
  const [restored, setRestored] = useState(!initial || initial.ok);
  const [copyMessage, setCopyMessage] = useState("");
  const errors = validateInput(input);
  const encoded = errors.length || !restored ? null : encodeHousing(input);
  const result = useMemo(() => validateInput(input).length || !restored ? null : computeHousing(input), [input, restored]);
  useEffect(() => {
    if (!encoded) return;
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url);
  }, [encoded]);
  const set = <K extends keyof HousingInput>(key: K, value: HousingInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value })); setCopyMessage("");
  };
  const numeric = (value: string) => value === "" ? NaN : Number(value);
  async function copyLink() {
    if (!encoded) return;
    const url = new URL(window.location.href); url.searchParams.set("s", encoded);
    try { await navigator.clipboard.writeText(url.toString()); setCopyMessage("현재 입력값의 공유 링크를 복사했습니다."); }
    catch { setCopyMessage("복사하지 못했습니다. 주소창의 링크를 직접 복사하세요."); }
  }
  return <main className="mx-auto max-w-6xl break-keep px-5 py-12 text-pretty">
    <header className="max-w-3xl">
      <p className="text-xs text-muted">14 / 연재</p>
      <h1 className="mt-3 text-balance text-3xl font-medium">주택 세금 통합 계산기</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">집을 살 때와 보유할 때, 세금을 나누어 살펴봅니다. 취득세·재산세·종합부동산세의 표준 계산을 한 화면에서 확인하고, 팔 때의 세금은 주택 양도세 계산기로 이어집니다.</p>
      <p className="mt-3 text-xs text-muted">작업실 · 작성일 {new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })} · 세율 버전 {HOUSING_RATES_VERSION}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
    </header>
    {initial && !initial.ok && !restored && <div role="alert" className="mt-6 border border-warn p-4 text-sm leading-relaxed text-warn"><p>{initial.reason} {LINK_ERROR_NEXT}</p><p className="mt-2">잘못된 링크의 결과는 표시하지 않습니다. 아래 버튼으로 가상 예시를 새로 열고 값을 입력하세요.</p><button type="button" onClick={() => { setInput(DEFAULT_INPUT); setRestored(true); }} className="mt-3 border border-ink px-3 py-2 text-ink">가상 예시로 새로 시작</button></div>}
    {initial?.ok && initial.ratesChanged && <p role="status" className="mt-6 border border-warn p-3 text-sm text-warn">공유 시점과 세율 버전이 달라 현재 버전으로 다시 계산했습니다.</p>}
    <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="no-print lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <h2 className="border-b border-ink pb-3 text-xl">새로 사는 집</h2>
        {!initial?.ok && <p className="mt-3 text-xs leading-relaxed text-muted">가상 예시입니다. 개인 거주자의 일반주택 단독명의만 다룹니다. 실제 검토할 값으로 바꾸세요.</p>}
        <form className="mt-5 space-y-5" onSubmit={e => e.preventDefault()}>
          <label className="block text-sm" htmlFor="purchasePrice">취득가액 (원)
            <input id="purchasePrice" type="number" inputMode="numeric" min="0" max="1000000000000" step="1" value={Number.isFinite(input.purchasePrice) ? input.purchasePrice : ""} onChange={e => set("purchasePrice", numeric(e.target.value))} className={fieldClass} aria-describedby="purchase-hint" />
            <span id="purchase-hint" className="mt-1 block text-xs text-muted">{Number.isFinite(input.purchasePrice) ? formatWon(input.purchasePrice) : "금액을 입력하세요"}. 취득 검토가 없으면 영으로 입력. 취득 부대비용 등 과세표준 포함 여부는 별도 확인하세요.</span>
          </label>
          <label className="block text-sm" htmlFor="acquisitionHomes">이 집 취득 직후 세대의 주택 수
            <input id="acquisitionHomes" type="number" min="1" max="10" step="1" value={Number.isFinite(input.acquisitionHomes) ? input.acquisitionHomes : ""} onChange={e => setInput(prev => ({ ...prev, acquisitionHomes: numeric(e.target.value), temporaryTwo: false }))} className={fieldClass} aria-describedby="count-hint" />
            <span id="count-hint" className="mt-1 block text-xs leading-relaxed text-muted">본인만의 주택 수가 아닙니다. 세대원의 주택과 주택 수에 들어가는 분양권·입주권 등도 확인하세요. 저가주택 등 중과 제외는 자동 판정하지 않습니다.</span>
          </label>
          <label className="flex items-start gap-2 text-sm leading-relaxed"><input className="mt-1" type="checkbox" checked={input.regulated} onChange={e => set("regulated", e.target.checked)} /><span>새로 사는 집이 조정대상지역에 있습니다<span className="mt-1 block text-xs text-muted">취득·계약 시점의 지정고시와 경과규정을 직접 확인하세요.</span></span></label>
          {input.acquisitionHomes === 2 && <label className="flex items-start gap-2 text-sm leading-relaxed"><input className="mt-1" type="checkbox" checked={input.temporaryTwo} onChange={e => set("temporaryTwo", e.target.checked)} /><span>취득세 일시적 2주택 특례 요건을 충족합니다<span className="mt-1 block text-xs text-muted">영 제28조의5: 종전·신규 모두 조정지역이면 처분기한 2년, 그 외 3년. 이사 등 사유·기간 기산·경과규정은 Josh 감수 필요. 보유세 특례는 자동 적용되지 않습니다.</span></span></label>}
          <label className="flex items-start gap-2 text-sm leading-relaxed"><input className="mt-1" type="checkbox" checked={input.ruralExempt} onChange={e => set("ruralExempt", e.target.checked)} /><span>취득 농어촌특별세의 서민주택 비과세 요건을 충족합니다<span className="mt-1 block text-xs text-muted">국민주택규모 이하 주거용 건물과 기준면적 이내 부수토지. 면적만으로 확정하지 말고 영 제4조 제5항 요건을 확인하세요. 종부세의 농특세에는 적용되지 않습니다.</span></span></label>
          <h2 className="border-b border-ink pt-4 pb-3 text-xl">과세기준일에 가진 집</h2>
          <p className="text-xs leading-relaxed text-muted">보유세는 올해 6월 1일 기준입니다. 그날 본인 단독명의로 보유한 모든 주택을 입력하세요. 새로 살 집과 보유주택의 수·가격은 다를 수 있습니다. 해당 날짜의 세대별 요건도 확인하세요.</p>
          {input.homes.map((home, i) => <fieldset key={i} className="border-l border-line pl-3">
            <legend className="text-sm">보유주택 {i + 1}</legend>
            <label className="mt-3 block text-sm" htmlFor={`public-${i}`}>공시가격 (원)
              <input id={`public-${i}`} type="number" inputMode="numeric" min="1" max="1000000000000" step="1" value={Number.isFinite(home.publicValue) ? home.publicValue : ""} onChange={e => set("homes", input.homes.map((h, n) => n === i ? { ...h, publicValue: numeric(e.target.value) } : h))} className={fieldClass} aria-describedby={`public-hint-${i}`} />
              <span id={`public-hint-${i}`} className="mt-1 block text-xs text-muted">{Number.isFinite(home.publicValue) ? formatWon(home.publicValue) : "공시가격을 입력하세요"}. 매매 시세와 다릅니다.</span>
            </label>
            <label className="mt-3 flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={home.urban} onChange={e => set("homes", input.homes.map((h, n) => n === i ? { ...h, urban: e.target.checked } : h))} /><span>재산세 도시지역분 고시 대상입니다</span></label>
            <button type="button" className="mt-3 text-xs underline underline-offset-4" onClick={() => setInput(prev => ({ ...prev, homes: prev.homes.filter((_, n) => n !== i), householdSingle: false }))}>이 보유주택 제외</button>
          </fieldset>)}
          {input.homes.length < 10 && <button type="button" onClick={() => setInput(prev => ({ ...prev, homes: [...prev.homes, { publicValue: 300_000_000, urban: true }], householdSingle: false }))} className="border border-line px-3 py-2 text-sm">보유주택 추가</button>}
          {input.homes.length === 1 && <label className="flex items-start gap-2 text-sm leading-relaxed"><input className="mt-1" type="checkbox" checked={input.householdSingle} onChange={e => set("householdSingle", e.target.checked)} /><span>기준일에 본인만 세대 내 유일한 주택을 단독명의로 가진 거주자입니다<span className="mt-1 block text-xs text-muted">재산세·종부세 모두 단순 1세대 1주택 요건을 충족한 경우만 선택하세요. 배우자 등 세대원 소유, 공동명의, 각 세목의 주택 수 제외 특례는 별도 검토합니다.</span></span></label>}
          <label className="block text-sm" htmlFor="age">기준일 만 나이 (세)<input id="age" type="number" min="0" max="120" step="1" value={Number.isFinite(input.age) ? input.age : ""} onChange={e => set("age", numeric(e.target.value))} className={fieldClass} /></label>
          <label className="block text-sm" htmlFor="holdingYears">기준일까지 채운 보유연수 (년)<input id="holdingYears" type="number" min="0" max="100" step="1" value={Number.isFinite(input.holdingYears) ? input.holdingYears : ""} onChange={e => set("holdingYears", numeric(e.target.value))} className={fieldClass} /><span className="mt-1 block text-xs text-muted">재건축·배우자 상속 등 기간 합산 특례는 별도 확인하세요.</span></label>
          {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-warn">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
        </form>
        <div className="mt-6 flex flex-wrap gap-3 text-sm"><button type="button" disabled={!encoded} onClick={copyLink} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas disabled:opacity-50">공유 링크 복사</button>{encoded && <Link href={`/tools/housing-tax/report?s=${encoded}`} className="border border-ink px-3 py-2 hover:bg-ink hover:text-canvas">검토보고서 (인쇄·PDF)</Link>}</div>
        <p role="status" className="mt-2 min-h-5 text-xs text-muted">{copyMessage}</p>
      </div>
      <div aria-live="polite">{result ? <HousingResult input={input} result={result} /> : <p className="border-t border-ink pt-5 text-sm text-warn">{!restored ? "공유 링크를 복원하지 못해 결과를 표시하지 않습니다." : "입력 오류를 고치면 결과를 다시 계산합니다."}</p>}</div>
    </div>
  </main>;
}
