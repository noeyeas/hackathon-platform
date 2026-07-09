"use client";

import { useEffect, useState } from "react";

// 마지막으로 확인한 시각(localStorage)보다 새 댓글이 있으면 배지 표시.
// "확인"을 누르면 현재 최신 댓글 시각을 저장해 배지를 감춘다.
export function NewCommentsBadge({
  projectId,
  latestAt,
}: {
  projectId: string;
  latestAt: string | null;
}) {
  const [isNew, setIsNew] = useState(false);
  const key = `seen_comment_${projectId}`;

  useEffect(() => {
    if (!latestAt) return;
    const seen = localStorage.getItem(key);
    if (!seen || new Date(latestAt) > new Date(seen)) setIsNew(true);
  }, [key, latestAt]);

  if (!isNew) return null;

  return (
    <button
      onClick={() => {
        if (latestAt) localStorage.setItem(key, latestAt);
        setIsNew(false);
      }}
      className="chip border-vote bg-vote/10 text-vote"
      title="새 댓글을 확인 처리합니다"
    >
      🔔 새 댓글 · 확인
    </button>
  );
}
