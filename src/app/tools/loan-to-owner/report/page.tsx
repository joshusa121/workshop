import type { Metadata } from "next";
import { Suspense } from "react";
import { LoanReport } from "@/components/loan-to-owner/LoanReport";
export const metadata: Metadata = { title: "법인 가지급금 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><LoanReport /></Suspense>;
}
