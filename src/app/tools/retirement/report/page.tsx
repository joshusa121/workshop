import type { Metadata } from "next";
import { Suspense } from "react";
import { RetirementReport } from "@/components/retirement/RetirementReport";

export const metadata: Metadata = { title: "퇴직소득세 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><RetirementReport /></Suspense>;
}
