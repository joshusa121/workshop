import Link from "next/link";
import { PRODUCTS, SITE_NAME } from "@/lib/catalog";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 md:py-24">
      <p className="text-xs tracking-[0.18em] text-muted">WORKSHOP / {SITE_NAME}</p>
      <h1 className="mt-4 max-w-xl text-balance text-3xl font-medium leading-snug md:text-4xl">
        지금까지 만든 제품 {PRODUCTS.length}개.
        <br />
        목록이 아니라 연재입니다.
      </h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">
        세무 상담에서 반복되는 질문만, 계산이 성립하는 것만 만듭니다. 빈 칸을 채워 102개를
        나열하지 않습니다. 지금은 {PRODUCTS.length}화.
      </p>

      <ol className="mt-16 border-t border-ink">
        {PRODUCTS.map((p) => (
          <li key={p.slug} className="border-b border-line">
            <Link
              href={p.href}
              className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 gap-y-1 py-7"
            >
              <span className="num bg-ink px-2 py-1 text-[11px] text-canvas">
                {String(p.number).padStart(2, "0")}
              </span>
              <span>
                <span className="block text-lg text-ink group-hover:text-accent">{p.name}</span>
                <span className="mt-1 block text-sm text-muted">{p.blurb}</span>
              </span>
              <span className="num hidden text-xs text-muted md:block">
                {p.madeAt} · v{p.version}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
