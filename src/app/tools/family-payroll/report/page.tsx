import type { Metadata } from "next";
import { Suspense } from "react";
import { FamilyReport } from "@/components/family-payroll/FamilyReport";
export const metadata: Metadata = { title: "가족 고용 절세 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><FamilyReport /></Suspense>;
}
