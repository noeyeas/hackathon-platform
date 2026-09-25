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
  maxFileBytes,
}: {
  action: (formData: FormData) => Promise<Result>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  successMessage?: string;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
  /** 첨부 파일 1개당 허용 크기. 넘으면 전송하지 않고 문구를 보여준다. */
  maxFileBytes?: number;
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

    // 전송 전 파일 크기 검사. 한도를 넘는 요청은 서버 액션이 실행되기도 전에
    // 플랫폼이 413 으로 끊어버리므로(Vercel 본문 상한 4.5MB), 서버 검증만
    // 믿으면 사용자는 이유도 모른 채 실패한다. 여기서 먼저 걸러 알려준다.
    if (maxFileBytes) {
      const tooBig = Array.from(fd.values()).find(
        (v): v is File => v instanceof File && v.size > maxFileBytes
      );
      if (tooBig) {
        const mb = Math.round(maxFileBytes / 1024 / 1024);
        setError(`파일이 너무 큽니다 — ${mb}MB 이하로 줄여서 올려주세요.`);
        return;
      }
    }

    startTransition(async () => {
      try {
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
      } catch (e) {
        // 서버 액션이 예외를 던지는 경로(413·네트워크 단절·서버 오류)는
        // 지금까지 화면에 아무 흔적도 남기지 않았다 — 저장이 안 됐는데
        // 버튼만 원래대로 돌아와 제출한 줄 알고 넘어가게 된다.
        console.error("[form]", e);
        setError(
          "전송에 실패했어요. 네트워크 상태를 확인하고 다시 시도해 주세요."
        );
      }
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
