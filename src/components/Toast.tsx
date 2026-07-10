"use client";

import { useCallback, useEffect, useState } from "react";

// 의존성 없는 경량 토스트. 삭제 실패처럼 일시적인 알림을 브라우저 alert 대신
// 화면 하단에 잠깐 띄운다. 사용: const { toast, node } = useToast();
// 실패 시 toast("문구") 호출하고, JSX 어딘가에 {node} 를 렌더(고정 위치라 위치 무관).
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const toast = useCallback((m: string) => setMsg(m), []);

  useEffect(() => {
    if (msg === null) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const node =
    msg === null ? null : (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-lg"
      >
        <span aria-hidden>⚠️</span>
        {msg}
      </div>
    );

  return { toast, node };
}
