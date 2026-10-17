import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarReport } from "@/components/tax-calendar/CalendarReport";

export const metadata: Metadata = {title:"절세 캘린더 검토보고서",robots:{index:false,follow:false}};
export default function Page() {
  return <Suspense fallback={<main className="p-8 text-sm text-muted">보고서를 불러오는 중</main>}><CalendarReport/></Suspense>;
}
