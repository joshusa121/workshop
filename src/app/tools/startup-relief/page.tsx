import type { Metadata } from "next";
import { Suspense } from "react";
import { StartupReliefCalculator } from "@/components/startup-relief/StartupReliefCalculator";

export const metadata: Metadata = {
  title: "창업중소기업 감면 판정",
  description: "창업일·지역·청년 요건으로 일반 창업 감면 대상과 감면기간, 한도 적용 전후 감면액을 근거 조문과 함께 확인합니다.",
};
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><StartupReliefCalculator /></Suspense>;
}
