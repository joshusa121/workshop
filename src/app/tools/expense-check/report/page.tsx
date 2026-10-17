import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpenseReport } from "@/components/expense-check/ExpenseReport";

export const metadata: Metadata = { title: "경비처리 검토보고서", robots: { index: false, follow: false } };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><ExpenseReport /></Suspense>;
}
