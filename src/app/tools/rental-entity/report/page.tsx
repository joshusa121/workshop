import type { Metadata } from "next";
import { Suspense } from "react";
import { RentalReport } from "@/components/rental-entity/RentalReport";
export const metadata: Metadata = { title: "부동산 임대 개인 vs 법인 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><RentalReport /></Suspense>;
}
