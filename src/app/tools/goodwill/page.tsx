import type { Metadata } from "next";
import { Suspense } from "react";
import { GoodwillCalculator } from "@/components/goodwill/GoodwillCalculator";

export const metadata: Metadata = {
  title: "영업권 계산기",
  description: "개인사업자가 법인으로 바꿀 때 영업권을 얼마로 평가하고, 세금이 얼마나 오가는지 계산합니다.",
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <GoodwillCalculator />
    </Suspense>
  );
}
