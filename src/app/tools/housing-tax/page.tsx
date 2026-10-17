import type { Metadata } from "next";
import { Suspense } from "react";
import { HousingCalculator } from "@/components/housing-tax/HousingCalculator";
export const metadata: Metadata = {
  title: "주택 세금 통합 계산기",
  description: "취득세·재산세·종합부동산세를 일회성·연간 세금으로 나누고, 계산 과정과 근거 조문을 확인합니다.",
};
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><HousingCalculator /></Suspense>;
}
