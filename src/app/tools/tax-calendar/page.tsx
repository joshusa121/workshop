import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarCalculator } from "@/components/tax-calendar/CalendarCalculator";

export const metadata: Metadata = {
  title: "절세 캘린더",
  description: "사업자·과세 유형에 맞는 신고·납부 일정을 법정 명목일과 근거 조문으로 확인합니다. 휴일 이연은 반영하지 않습니다.",
};
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">일정을 불러오는 중</main>}><CalendarCalculator/></Suspense>;
}
