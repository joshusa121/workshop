import type { Metadata } from "next";
import { Suspense } from "react";
import { ChecklistCalculator } from "@/components/filing-checklist/ChecklistCalculator";
export const metadata: Metadata = { title: "신고 서류 체크리스트", description: "종합소득세 신고 유형과 장부 작성 방식에 맞는 주요 서류를 법령 근거와 함께 확인하고, 준비 상태를 공유하세요." };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><ChecklistCalculator /></Suspense>;
}
