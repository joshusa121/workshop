import type { Metadata } from "next";
import { Suspense } from "react";
import { CompIncomeReport } from "@/components/comp-income/CompIncomeReport";

export const metadata: Metadata = {
  title: "종합소득세 예상 검토보고서",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <CompIncomeReport />
    </Suspense>
  );
}
