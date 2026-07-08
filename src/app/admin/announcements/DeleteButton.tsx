"use client";

import { useTransition } from "react";
import { deleteAnnouncement } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm("이 공지를 삭제할까요?"))
          startTransition(() => void deleteAnnouncement(id));
      }}
      disabled={pending}
      className="text-sm text-[var(--muted)] hover:text-red-500"
    >
      {pending ? "..." : "삭제"}
    </button>
  );
}
