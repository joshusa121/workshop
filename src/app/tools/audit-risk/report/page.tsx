import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditRiskReport } from "@/components/audit-risk/AuditRiskReport";

export const metadata: Metadata = { title: "세무조사 리스크 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><AuditRiskReport /></Suspense>;
}
