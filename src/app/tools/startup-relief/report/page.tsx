import type { Metadata } from "next";
import { Suspense } from "react";
import { StartupReliefReport } from "@/components/startup-relief/StartupReliefReport";

export const metadata: Metadata = { title: "창업중소기업 감면 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><StartupReliefReport /></Suspense>;
}
