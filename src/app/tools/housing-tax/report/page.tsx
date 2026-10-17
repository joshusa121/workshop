import type { Metadata } from "next";
import { Suspense } from "react";
import { HousingReport } from "@/components/housing-tax/HousingReport";
export const metadata: Metadata = { title: "주택 세금 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><HousingReport /></Suspense>;
}
