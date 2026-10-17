import type { Metadata } from "next";
import { Suspense } from "react";
import { VatCalculator } from "@/components/vat/VatCalculator";

export const metadata: Metadata = {
  title: "부가가치세 계산기",
  description: "같은 매출·매입으로 간이과세와 일반과세의 부가가치세를 비교하고, 간이과세 요건·납부면제 여부를 판정합니다.",
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <VatCalculator />
    </Suspense>
  );
}
