"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment } from "@/app/gallery/actions";

// 댓글 입력폼 (로그인 사용자에게만 노출)
export function CommentForm({ projectId }: { projectId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await addComment(projectId, text);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="응원과 피드백을 남겨주세요"
        rows={3}
        maxLength={1000}
        className="input resize-none"
      />
      <p className="text-xs text-[var(--muted)]">
        무분별한 비난이나 악성 댓글은 통보 없이 삭제될 수 있습니다.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">{body.length}/1000</span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="btn-primary"
        >
          {pending ? "등록 중…" : "댓글 등록"}
        </button>
      </div>
    </div>
  );
}

// 댓글 삭제 버튼 (작성자 본인 또는 운영진에게만 노출)
export function DeleteCommentButton({
  commentId,
  projectId,
}: {
  commentId: string;
  projectId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    if (pending) return;
    if (!confirm("댓글을 삭제할까요?")) return;
    startTransition(async () => {
      const res = await deleteComment(commentId, projectId);
      if (res?.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="text-xs text-[var(--muted)] hover:text-red-500 disabled:opacity-50"
    >
      삭제
    </button>
  );
}
