"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 서버 컴포넌트 페이지를 주기적으로 router.refresh() 해서 새 데이터를 자동 반영.
// (예: 공지 페이지 — 현장에서 새 공지를 새로고침 없이 받아본다)
// 탭이 숨겨지면 폴링을 멈추고, 다시 보이면 즉시 한 번 새로고침 후 재개해 자원을 아낀다.
export function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null) timer = setInterval(() => router.refresh(), intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
