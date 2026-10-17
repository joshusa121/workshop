import type { Metadata } from "next";
import { Suspense } from "react";
import { SincereReport } from "@/components/sincere-filing/SincereReport";
export const metadata: Metadata = { title: "성실신고확인대상 판정 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><SincereReport /></Suspense>;
}
