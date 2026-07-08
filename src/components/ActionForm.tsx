"use client";

import { useState, useTransition } from "react";

type Result = { ok?: boolean; error?: string } | void;

// 서버 액션을 감싸 로딩/에러 상태를 처리하는 폼
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  successMessage,
}: {
  action: (formData: FormData) => Promise<Result>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  successMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await action(fd);
      if (res && "error" in res && res.error) setError(res.error);
      else setDone(true);
    });
  }

  if (done && successMessage) {
    return (
      <p className="rounded-lg bg-team/10 px-4 py-3 text-sm text-team">
        {successMessage}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button disabled={pending} className="btn-primary mt-3 w-full">
        {pending ? "처리 중..." : submitLabel}
      </button>
    </form>
  );
}
