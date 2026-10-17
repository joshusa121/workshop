import type { Metadata } from "next";
import { Suspense } from "react";
import { FamilyCalculator } from "@/components/family-payroll/FamilyCalculator";
export const metadata: Metadata = { title: "가족 고용 절세 판정", description: "배우자·자녀의 실제 근무와 급여 비용 인정 요건을 확인하고, 사업주 세금 감소에서 가족 보험료·근로소득세를 뺀 가계 변화를 비교합니다." };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><FamilyCalculator /></Suspense>;
}
