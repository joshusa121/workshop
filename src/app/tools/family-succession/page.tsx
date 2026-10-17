import type { Metadata } from "next";
import { Suspense } from "react";
import { FamilySuccessionCalculator } from "@/components/family-succession/FamilySuccessionCalculator";
export const metadata: Metadata = { title: "가업승계 공제 판정", description: "가업상속공제와 가업승계 주식 증여특례의 요건·한도·공제액을 법령 근거와 함께 점검합니다." };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><FamilySuccessionCalculator /></Suspense>;
}
