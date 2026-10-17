import type { Metadata } from "next";
import { Suspense } from "react";
import { WithholdingCalculator } from "@/components/withholding/WithholdingCalculator";

export const metadata: Metadata = {
  title: "원천세 계산기",
  description: "사업소득·기타소득·일반 이자·배당 지급 시 원천징수 소득세와 지방소득세, 실수령액을 근거 조문과 계산합니다. 근로소득은 제외합니다.",
};
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><WithholdingCalculator /></Suspense>;
}
