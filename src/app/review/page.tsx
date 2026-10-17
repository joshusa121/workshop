import type { Metadata } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { runGoodwill } from "@/lib/tax/goodwill/net-effect";
import { encodeGoodwill } from "@/lib/tax/goodwill/share";
import { computeCgt } from "@/lib/tax/cgt/cgt";
import { SAMPLE_TEMPORARY } from "@/lib/tax/cgt/defaults";
import { encodeCgt } from "@/lib/tax/cgt/share";
import { computeCompIncome } from "@/lib/tax/comp-income/engine";
import { DEFAULT_COMP_INCOME } from "@/lib/tax/comp-income/input";
import { encodeCompIncome } from "@/lib/tax/comp-income/share";
import { computeVat } from "@/lib/tax/vat/engine";
import { DEFAULT_VAT } from "@/lib/tax/vat/input";
import { encodeVat } from "@/lib/tax/vat/share";
import { computeFundsSource } from "@/lib/tax/funds-source/engine";
import { DEFAULT_FUNDS_SOURCE } from "@/lib/tax/funds-source/input";
import { encodeFundsSource } from "@/lib/tax/funds-source/share";
import { computeGiftInheritance } from "@/lib/tax/gift-inheritance/engine";
import { DEFAULT_GIFT_INHERITANCE } from "@/lib/tax/gift-inheritance/input";
import { encodeGiftInheritance } from "@/lib/tax/gift-inheritance/share";
import { computeFinancial } from "@/lib/tax/financial/engine";
import { DEFAULT_FINANCIAL } from "@/lib/tax/financial/input";
import { encodeFinancial } from "@/lib/tax/financial/share";
import { computeRetirement } from "@/lib/tax/retirement/engine";
import { SAMPLE_EXECUTIVE } from "@/lib/tax/retirement/input";
import { encodeRetirement } from "@/lib/tax/retirement/share";
import { computeRental } from "@/lib/tax/rental-entity/engine";
import { DEFAULT_INPUT as DEFAULT_RENTAL } from "@/lib/tax/rental-entity/input";
import { encodeRental } from "@/lib/tax/rental-entity/share";
import { computeLoanToOwner } from "@/lib/tax/loan-to-owner/engine";
import { SAMPLE_LOAN_INPUT } from "@/lib/tax/loan-to-owner/input";
import { encodeLoanToOwner } from "@/lib/tax/loan-to-owner/share";
import { computeStartupRelief } from "@/lib/tax/startup-relief/engine";
import { SAMPLE_STARTUP_RELIEF } from "@/lib/tax/startup-relief/input";
import { encodeStartupRelief } from "@/lib/tax/startup-relief/share";
import { computeSincereFiling } from "@/lib/tax/sincere-filing/engine";
import { DEFAULT_INPUT as DEFAULT_SINCERE } from "@/lib/tax/sincere-filing/input";
import { encodeSincere } from "@/lib/tax/sincere-filing/share";
import { computeHousing } from "@/lib/tax/housing-tax/engine";
import { DEFAULT_INPUT as DEFAULT_HOUSING } from "@/lib/tax/housing-tax/input";
import { encodeHousing } from "@/lib/tax/housing-tax/share";
import { computeFamilySuccession } from "@/lib/tax/family-succession/engine";
import { SAMPLE_FAMILY_SUCCESSION } from "@/lib/tax/family-succession/input";
import { encodeFamilySuccession } from "@/lib/tax/family-succession/share";
import { computeAuditRisk } from "@/lib/tax/audit-risk/engine";
import { SAMPLE_AUDIT_RISK_INPUT } from "@/lib/tax/audit-risk/input";
import { encodeAuditRisk } from "@/lib/tax/audit-risk/share";
import { computeExpense } from "@/lib/tax/expense-check/engine";
import { DEFAULT_INPUT as DEFAULT_EXPENSE } from "@/lib/tax/expense-check/input";
import { encodeExpense } from "@/lib/tax/expense-check/share";
import { computeFamilyPayroll } from "@/lib/tax/family-payroll/engine";
import { SAMPLE_FAMILY_INPUT } from "@/lib/tax/family-payroll/input";
import { encodeFamilyPayroll } from "@/lib/tax/family-payroll/share";
import { computeCalendar } from "@/lib/tax/tax-calendar/engine";
import { DEFAULT_INPUT as DEFAULT_CALENDAR } from "@/lib/tax/tax-calendar/input";
import { encodeCalendar } from "@/lib/tax/tax-calendar/share";
import { computeChecklist } from "@/lib/tax/filing-checklist/engine";
import { DEFAULT_INPUT as DEFAULT_CHECKLIST } from "@/lib/tax/filing-checklist/input";
import { encodeChecklist } from "@/lib/tax/filing-checklist/share";
import { computeWithholding } from "@/lib/tax/withholding/engine";
import { DEFAULT_WITHHOLDING } from "@/lib/tax/withholding/input";
import { encodeWithholding } from "@/lib/tax/withholding/share";
import { decodeScenario } from "@/lib/share-codec";
import { runIndividual, runCorporate } from "@/lib/tax/scenario";
import { resolveAssumptions } from "@/lib/tax/assumptions";

export const metadata: Metadata = {
  title: "감수 시트",
  robots: { index: false, follow: false },
};

const BASE = "https://workshop-sigma-five.vercel.app";
const CORP = "eyJ2IjozLCJyIjoiMjAyNi00IiwiZCI6eyJyZXZlbnVlIjo0MDAwMDAwMDAsImFjY291bnRpbmdQcm9maXQiOjE1MDAwMDAwMCwidGF4QWRqdXN0bWVudCI6MCwiaW5kdXN0cnlHcm91cCI6IuyEnOu5hOyKpOyehOuMgCIsIndvcmtwbGFjZSI6eyJzaWRvIjoi67aA7IKw6rSR7Jet7IucIn0sImFzc2V0cyI6eyJ0b3RhbCI6MTAwMDAwMDAwLCJyZWFsRXN0YXRlIjowLCJob3VzaW5nIjowfSwibGlhYmlsaXRpZXMiOjAsImNhcGl0YWwiOjUwMDAwMDAwLCJvd25lclNhbGFyeSI6NzIwMDAwMDAsImRpdmlkZW5kQW1vdW50IjoxMDAwMDAwMCwicmV0aXJlbWVudFBsYW4iOmZhbHNlLCJyZXRpcmVtZW50TXVsdGlwbGUiOjIsImZhbWlseVdvcmtlcnMiOjEsImZhbWlseVNhbGFyeUVhY2giOjM2MDAwMDAwLCJmYW1pbHlMaXZlc1NlcGFyYXRlbHkiOmZhbHNlLCJwbGFuc1JlYWxFc3RhdGVQdXJjaGFzZSI6ZmFsc2UsIm5vblRheFJlYXNvbnMiOmZhbHNlLCJ5ZWxsb3dVbWJyZWxsYUVuYWJsZWQiOnRydWUsInN0YXJ0dXBSZWxpZWZSYXRlIjowLCJzdGFydHVwUmVsaWVmWWVhcnNMZWZ0IjozLCJib29ra2VlcGluZ1R5cGUiOiLrs7Xsi53rtoDquLAiLCJzaW5jZXJlRmlsaW5nQ29uZmlybUNvc3QiOjAsInZvbHVudGFyeUVtcGxveW1lbnRJbnMiOmZhbHNlLCJ2b2x1bnRhcnlXb3JrZXJzQ29tcCI6ZmFsc2UsInBlcnNvbmFsQ29udGV4dCI6eyJvdGhlckluY29tZSI6MH19fQ";

type Pair = { label: string; value: number };
function collect(obj: unknown, out: Pair[] = []): Pair[] {
  if (!obj || typeof obj !== "object") return out;
  const o = obj as Record<string, unknown>;
  if (typeof o.label === "string" && typeof o.value === "number") {
    out.push({ label: o.label, value: o.value });
    return out;
  }
  for (const v of Object.values(o)) if (v && typeof v === "object") collect(v, out);
  return out;
}
function dedupe(pairs: Pair[]): Pair[] {
  const seen = new Set<string>();
  return pairs.filter((p) => (seen.has(p.label) ? false : (seen.add(p.label), true)));
}
function nums(result: unknown, limit = 6): string {
  const pairs = dedupe(collect(result)).filter((p) => Number.isFinite(p.value));
  return pairs.slice(0, limit).map((p) => `${p.label} ${p.value.toLocaleString("ko-KR")}`).join(" · ");
}
const href = (n: number) => PRODUCTS.find((p) => p.number === n)?.href ?? "";

function buildRows() {
  const rows: { n: number; name: string; code: string; summary: string }[] = [];
  const add = (n: number, name: string, code: string, result: unknown) => rows.push({ n, name, code, summary: nums(result) });

  {
    const d = decodeScenario(CORP);
    const summary = d.ok
      ? (() => {
          const a = resolveAssumptions(d.input.overrides);
          const pairs = dedupe([...collect(runIndividual(d.input, a)), ...collect(runCorporate(d.input, a))]).filter((x) => Number.isFinite(x.value));
          const pick = pairs.filter((x) => /총|합계|차액|세부담|실수령|순자산/.test(x.label)).slice(0, 6);
          return (pick.length ? pick : pairs.slice(0, 6)).map((x) => `${x.label} ${x.value.toLocaleString("ko-KR")}`).join(" · ");
        })()
      : "(디코드 실패)";
    rows.push({ n: 1, name: "법인전환 시뮬레이터", code: CORP, summary });
  }

  const GW = { netIncomes: [150_000_000, 120_000_000, 100_000_000] as [number, number, number], equity: 200_000_000, otherComprehensiveIncome: 0, corpTaxBase: 200_000_000, withRealEstate: false, discountRate: 0 };
  add(2, "영업권 계산기", encodeGoodwill(GW), runGoodwill(GW));
  add(3, "주택 양도세 계산기", encodeCgt(SAMPLE_TEMPORARY), computeCgt(SAMPLE_TEMPORARY));
  add(4, "종합소득세 예상 계산기", encodeCompIncome(DEFAULT_COMP_INCOME), computeCompIncome(DEFAULT_COMP_INCOME));
  add(5, "부가가치세 계산기", encodeVat(DEFAULT_VAT), computeVat(DEFAULT_VAT));
  add(6, "자금출처 셀프 진단", encodeFundsSource(DEFAULT_FUNDS_SOURCE), computeFundsSource(DEFAULT_FUNDS_SOURCE));
  add(7, "증여 vs 상속 시뮬레이터", encodeGiftInheritance(DEFAULT_GIFT_INHERITANCE), computeGiftInheritance(DEFAULT_GIFT_INHERITANCE));
  add(8, "금융투자 세금 계산기", encodeFinancial(DEFAULT_FINANCIAL), computeFinancial(DEFAULT_FINANCIAL));
  add(9, "퇴직소득세 계산기", encodeRetirement(SAMPLE_EXECUTIVE), computeRetirement(SAMPLE_EXECUTIVE));
  add(10, "부동산 임대 개인 vs 법인", encodeRental(DEFAULT_RENTAL), computeRental(DEFAULT_RENTAL));
  add(11, "법인 가지급금 진단", encodeLoanToOwner(SAMPLE_LOAN_INPUT), computeLoanToOwner(SAMPLE_LOAN_INPUT));
  add(12, "창업중소기업 감면 판정", encodeStartupRelief(SAMPLE_STARTUP_RELIEF), computeStartupRelief(SAMPLE_STARTUP_RELIEF));
  add(13, "성실신고확인대상 판정", encodeSincere(DEFAULT_SINCERE), computeSincereFiling(DEFAULT_SINCERE));
  add(14, "주택 세금 통합 계산기", encodeHousing(DEFAULT_HOUSING), computeHousing(DEFAULT_HOUSING));
  add(15, "가업승계 공제 판정", encodeFamilySuccession(SAMPLE_FAMILY_SUCCESSION), computeFamilySuccession(SAMPLE_FAMILY_SUCCESSION));
  add(16, "세무조사 리스크 체크", encodeAuditRisk(SAMPLE_AUDIT_RISK_INPUT), computeAuditRisk(SAMPLE_AUDIT_RISK_INPUT));
  add(17, "경비처리 판정", encodeExpense(DEFAULT_EXPENSE), computeExpense(DEFAULT_EXPENSE));
  add(18, "가족 고용 절세 판정", encodeFamilyPayroll(SAMPLE_FAMILY_INPUT), computeFamilyPayroll(SAMPLE_FAMILY_INPUT));
  add(19, "절세 캘린더", encodeCalendar(DEFAULT_CALENDAR), computeCalendar(DEFAULT_CALENDAR));
  add(20, "신고 서류 체크리스트", encodeChecklist(DEFAULT_CHECKLIST), computeChecklist(DEFAULT_CHECKLIST));
  add(21, "원천세 계산기", encodeWithholding(DEFAULT_WITHHOLDING), computeWithholding(DEFAULT_WITHHOLDING));
  return rows.sort((a, b) => a.n - b.n);
}

export default function ReviewPage() {
  const rows = buildRows();
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted">INTERNAL / 감수</p>
      <h1 className="mt-3 text-3xl font-medium">감수 시트 — 21편 대표 계산</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        각 제품의 대표 입력으로 엔진을 실행한 결과입니다. [열기]를 누르면 같은 입력이 채워진 계산기가 뜨고, 숫자를 눌러 근거
        조문을 확인할 수 있습니다. 금액은 원 단위, 연도·비율·인원 등은 값 그대로입니다.
      </p>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-warn">
        링크에는 입력한 금액이 그대로 들어 있습니다(모두 가공값). 외부 공유용이 아닙니다. 이 페이지는 검색에 노출되지 않습니다.
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3">화</th>
              <th className="py-2 pr-3">제품</th>
              <th className="py-2 pr-3">대표 계산 결과</th>
              <th className="py-2">링크</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} className="border-b border-line align-top">
                <td className="num py-3 pr-3 text-muted">{String(r.n).padStart(2, "0")}</td>
                <td className="py-3 pr-3">{r.name}</td>
                <td className="py-3 pr-3 text-xs leading-relaxed text-muted">{r.summary || "—"}</td>
                <td className="py-3">
                  <a href={`${href(r.n)}?s=${r.code}`} className="underline underline-offset-4 hover:text-accent">
                    열기
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted">
        제품별 미반영·감수 항목은 저장소 <code>docs/verified/*-final-audit.md</code> 참고.
      </p>
    </main>
  );
}
