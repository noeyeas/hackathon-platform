"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 공개 화면을 주기적으로 새로고침해 현재 발표 팀을 실시간 반영
export function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
