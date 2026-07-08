"use client";

import { useTransition } from "react";
import { removeMember } from "./actions";

export function MemberRemoveButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(`'${name}' 님을 팀에서 내보낼까요?`))
          startTransition(() => void removeMember(userId));
      }}
      className="text-sm text-[var(--muted)] hover:text-red-500"
    >
      {pending ? "..." : "내보내기"}
    </button>
  );
}
