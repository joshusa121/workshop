import type { Metadata } from "next";
import { Suspense } from "react";
import { CgtReport } from "@/components/capital-gains/CgtReport";

export const metadata: Metadata = {
  title: "주택 양도세 검토보고서",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <CgtReport />
    </Suspense>
  );
}
