import type { Metadata } from "next";
import { Suspense } from "react";
import { CgtCalculator } from "@/components/capital-gains/CgtCalculator";

export const metadata: Metadata = {
  title: "주택 양도세 계산기",
  description: "집을 팔 때 비과세인지, 세금이 얼마인지, 다주택 중과 대상인지 날짜와 근거 조문으로 판정합니다.",
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <CgtCalculator />
    </Suspense>
  );
}
