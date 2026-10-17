import type { Metadata } from "next";
import { Suspense } from "react";
import { GiftInheritanceCalculator } from "@/components/gift-inheritance/GiftInheritanceCalculator";

export const metadata: Metadata = {
  title: "증여 vs 상속 시뮬레이터",
  description: "재산을 지금 증여·사후 상속·분할 증여 중 어느 방법이 세금이 적은지 상증세법 기준으로 비교합니다.",
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <GiftInheritanceCalculator />
    </Suspense>
  );
}
