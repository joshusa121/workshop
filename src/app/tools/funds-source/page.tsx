import type { Metadata } from "next";
import { Suspense } from "react";
import { FundsSourceCalculator } from "@/components/funds-source/FundsSourceCalculator";

export const metadata: Metadata = {
  title: "자금출처 셀프 진단",
  description: "집·땅 취득자금이 소명되는지 스스로 점검합니다. 소명 가능액과 부족액, 증여추정 배제 기준을 상증세법으로 진단합니다.",
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <FundsSourceCalculator />
    </Suspense>
  );
}
