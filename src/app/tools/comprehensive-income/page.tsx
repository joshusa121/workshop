import type { Metadata } from "next";
import { Suspense } from "react";
import { CompIncomeCalculator } from "@/components/comp-income/CompIncomeCalculator";

export const metadata: Metadata = {
  title: "종합소득세 예상 계산기",
  description:
    "프리랜서·개인사업자가 5월에 낼 종합소득세(또는 돌려받을 돈)를 3.3% 원천징수까지 반영해 미리 계산합니다.",
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <CompIncomeCalculator />
    </Suspense>
  );
}
