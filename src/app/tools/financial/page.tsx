import type { Metadata } from "next";
import { Suspense } from "react";
import { FinancialCalculator } from "@/components/financial/FinancialCalculator";

export const metadata: Metadata = {
  title: "금융투자 세금 계산기",
  description: "이자·배당 2천만원 종합과세 진단, 비교과세, 대주주 주식 양도세를 소득세법 원문 기준으로 계산합니다.",
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <FinancialCalculator />
    </Suspense>
  );
}
