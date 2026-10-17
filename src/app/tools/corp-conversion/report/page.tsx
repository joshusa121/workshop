import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportView } from "@/components/corp-conversion/ReportView";

export const metadata: Metadata = {
  title: "법인전환 검토보고서",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <ReportView />
    </Suspense>
  );
}
