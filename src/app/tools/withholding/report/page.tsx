import type { Metadata } from "next";
import { Suspense } from "react";
import { WithholdingReport } from "@/components/withholding/WithholdingReport";

export const metadata: Metadata = { title: "원천세 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><WithholdingReport /></Suspense>;
}
