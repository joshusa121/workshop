import type { Metadata } from "next";
import { Suspense } from "react";
import { RetirementCalculator } from "@/components/retirement/RetirementCalculator";

export const metadata: Metadata = { title: "퇴직소득세 계산기", description: "근속연수공제·환산급여공제와 임원 퇴직소득 한도를 근거 조문과 함께 계산합니다." };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><RetirementCalculator /></Suspense>;
}
