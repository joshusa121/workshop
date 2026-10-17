"use client";

import { useState } from "react";

export function ShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function confirmCopy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setOpen(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas"
      >
        {copied ? "복사됨" : "링크 복사"}
      </button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4">
          <div role="dialog" aria-modal="true" className="max-w-md border border-ink bg-paper p-6">
            <p className="text-sm leading-relaxed">
              이 링크에는 입력한 매출·자산 정보가 포함됩니다. 받는 사람이 값을 볼 수 있습니다.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={confirmCopy}
                className="bg-ink px-3 py-1.5 text-sm text-canvas"
              >
                그래도 복사
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
