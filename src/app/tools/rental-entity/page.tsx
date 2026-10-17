import type { Metadata } from "next";
import { Suspense } from "react";
import { RentalCalculator } from "@/components/rental-entity/RentalCalculator";
export const metadata: Metadata = {
  title: "부동산 임대 개인 vs 법인",
  description: "개인 주택임대 분리·종합과세와 법인세·배당 세금을 근거 조문으로 비교합니다. 배당금 분기점과 전제·미반영 사항을 확인하세요.",
};
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><RentalCalculator /></Suspense>;
}
