"use client";

import { useTransition } from "react";
import { deleteMilestone, deleteScheduleItem } from "./actions";

export function DeleteRow({
  id,
  kind,
  left,
  right,
}: {
  id: string;
  kind: "milestone" | "schedule";
  left: string;
  right: string;
}) {
  const [pending, startTransition] = useTransition();
  const del = kind === "milestone" ? deleteMilestone : deleteScheduleItem;

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold text-vote">{left}</span>
        <span className="text-sm">{right}</span>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("삭제할까요?")) startTransition(() => void del(id));
        }}
        className="text-sm text-[var(--muted)] hover:text-red-500"
      >
        {pending ? "..." : "삭제"}
      </button>
    </div>
  );
}
