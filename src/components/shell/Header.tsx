import Link from "next/link";
import { SITE_NAME } from "@/lib/catalog";

export function Header() {
  return (
    <header className="no-print border-b border-line">
      <div className="mx-auto flex max-w-5xl items-baseline justify-between px-5 py-4">
        <Link href="/" className="text-sm tracking-wide text-ink">
          {SITE_NAME}
        </Link>
        <p className="text-xs text-muted">연재 · 세무사가 직접 하나씩 만듭니다</p>
      </div>
    </header>
  );
}
