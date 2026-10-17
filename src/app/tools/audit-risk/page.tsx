import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditRiskCalculator } from "@/components/audit-risk/AuditRiskCalculator";

export const metadata: Metadata = { title: "세무조사 리스크 체크", description: "현금수입·가공경비 의심·대표 가지급금·접대비·무자료 매입을 점검하고 전문가와 확인할 자료를 정리합니다." };
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}><AuditRiskCalculator /></Suspense>;
}
