"use client";

import { useEffect, useState } from "react";

// "팀 작품 반응" 제목 옆에, 마지막으로 본 시각 이후 새 댓글이 있으면
// 리모컨 공지처럼 붉은 점을 띄운다. 카드에 마우스를 올리면 확인 처리(점 사라짐).
export function NewCommentsDot({
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

  function markSeen() {
    if (isNew && latestAt) {
      localStorage.setItem(key, latestAt);
      setIsNew(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5" onMouseEnter={markSeen}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        팀 작품 반응
      </h2>
      {isNew && (
        <span
          className="h-2 w-2 rounded-full bg-red-500"
          title="새 댓글이 있습니다"
          aria-label="새 댓글"
        />
      )}
    </div>
  );
}
