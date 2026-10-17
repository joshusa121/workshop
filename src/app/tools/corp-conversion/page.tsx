import type { Metadata } from "next";
import { Suspense } from "react";
import { Wizard } from "@/components/corp-conversion/Wizard";

export const metadata: Metadata = {
  title: "법인전환 시뮬레이터",
  description: "개인 유지와 법인 전환에서 손에 남는 돈·회사에 남는 이익·총 부담을 나눠 비교합니다.",
};

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">불러오는 중</main>}>
      <Wizard />
    </Suspense>
  );
}
