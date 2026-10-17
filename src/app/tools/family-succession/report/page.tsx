import type { Metadata } from "next";
import { Suspense } from "react";
import { FamilySuccessionReport } from "@/components/family-succession/FamilySuccessionReport";
export const metadata: Metadata = { title: "가업승계 공제 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><FamilySuccessionReport /></Suspense>;
}
