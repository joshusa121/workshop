import type { Metadata } from "next";
import { Suspense } from "react";
import { VatReport } from "@/components/vat/VatReport";

export const metadata: Metadata = {
  title: "부가가치세 비교 검토보고서",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <VatReport />
    </Suspense>
  );
}
