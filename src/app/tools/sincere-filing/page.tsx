import type { Metadata } from "next";
import { Suspense } from "react";
import { SincereCalculator } from "@/components/sincere-filing/SincereCalculator";
export const metadata: Metadata = { title: "성실신고확인대상 판정", description: "개인사업자의 업종별 수입금액으로 성실신고확인 대상, 복식부기 의무, 신고기한과 확인비용 공제 한도를 판정합니다." };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><SincereCalculator /></Suspense>;
}
