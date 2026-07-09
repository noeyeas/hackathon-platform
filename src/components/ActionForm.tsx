"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { ok?: boolean; error?: string } | void;

// 서버 액션을 감싸 로딩/에러/성공 상태를 처리하는 폼.
// 성공 시 폼을 유지한 채 일시적 안내를 띄우고 router.refresh() 로 목록을 갱신한다.
// (추가형 폼은 resetOnSuccess 로 입력값을 비운다)
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  successMessage = "저장되었습니다",
  onSuccess,
  resetOnSuccess = false,
}: {
  action: (formData: FormData) => Promise<Result>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  successMessage?: string;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await action(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (resetOnSuccess) form.reset();
      setOk(true);
      onSuccess?.();
      router.refresh();
      setTimeout(() => setOk(false), 2500);
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {ok && (
        <p className="mt-2 rounded-lg bg-team/10 px-4 py-2 text-sm text-team">
          {successMessage}
        </p>
      )}
      <button disabled={pending} className="btn-primary mt-3 w-full">
        {pending ? "처리 중..." : submitLabel}
      </button>
    </form>
  );
}
