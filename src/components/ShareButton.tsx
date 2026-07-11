"use client";

import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;

    // 모바일 등 공유 시트를 지원하면 그쪽을 먼저 사용
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // 사용자가 취소했거나 실패하면 링크 복사로 폴백
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 접근이 막힌 환경(비 HTTPS 등)
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="btn btn-ghost gap-1.5 hover:border-vote hover:text-vote"
    >
      <span className="text-base leading-none">🔗</span>
      {copied ? "링크 복사됨!" : "공유"}
    </button>
  );
}
