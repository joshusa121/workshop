import type { Metadata } from "next";
import { Suspense } from "react";
import { LoanCalculator } from "@/components/loan-to-owner/LoanCalculator";
export const metadata: Metadata = {
  title: "법인 가지급금 진단",
  description: "대표가 개인 용도로 가져간 회사 돈의 인정이자, 지급이자 비용 제한, 회사 세금 증가와 개인 소득처분 위험을 진단합니다.",
};
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><LoanCalculator /></Suspense>;
}
