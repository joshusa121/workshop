import { DISCLAIMER, SITE_NAME } from "@/lib/catalog";

export function Footer() {
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto max-w-5xl px-5 py-8 text-xs leading-relaxed text-muted">
        <p>{DISCLAIMER}</p>
        <p className="mt-3">
          <span>{SITE_NAME}</span>
          <span className="mx-2">·</span>
          <span data-todo="채널 URL" className="underline decoration-line underline-offset-4">
            유튜브
          </span>
        </p>
      </div>
    </footer>
  );
}
