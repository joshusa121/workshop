import type { Metadata } from "next";
import { Suspense } from "react";
import { GiftInheritanceReport } from "@/components/gift-inheritance/GiftInheritanceReport";

export const metadata: Metadata = {
  title: "증여·상속 비교 검토보고서",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <GiftInheritanceReport />
    </Suspense>
  );
}
