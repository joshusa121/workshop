import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpenseCalculator } from "@/components/expense-check/ExpenseCalculator";

export const metadata: Metadata = { title: "경비처리 판정", description: "사업 관련 지출의 증빙, 기업업무추진비·승용차·감가상각 한도를 법령 근거와 함께 검토합니다." };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><ExpenseCalculator /></Suspense>;
}
