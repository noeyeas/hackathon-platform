"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const READ_KEY = "notice_read_at";

// 상단 내비의 '공지' 링크. 안 읽은 새 공지가 있으면 붉은 점을 띄우고,
// 클릭하면(공지 페이지로 이동) 읽음 처리한다.
export function NoticeNavLink({ latestAt }: { latestAt: string | null }) {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    if (!latestAt) return setUnread(false);
    const read = localStorage.getItem(READ_KEY);
    setUnread(!read || new Date(latestAt) > new Date(read));
  }, [latestAt]);

  function markRead() {
    if (latestAt) localStorage.setItem(READ_KEY, latestAt);
    setUnread(false);
  }

  return (
    <Link
      href="/notice"
      onClick={markRead}
      className="relative rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
    >
      공지
      {unread && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
      )}
    </Link>
  );
}
