import type { Metadata } from "next";
import { Suspense } from "react";
import { FundsSourceReport } from "@/components/funds-source/FundsSourceReport";

export const metadata: Metadata = {
  title: "자금출처 자기진단 검토보고서",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <FundsSourceReport />
    </Suspense>
  );
}
