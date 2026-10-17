import type { Metadata } from "next";
import { Suspense } from "react";
import { ChecklistReport } from "@/components/filing-checklist/ChecklistReport";
export const metadata: Metadata = { title: "신고 서류 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><ChecklistReport /></Suspense>;
}
