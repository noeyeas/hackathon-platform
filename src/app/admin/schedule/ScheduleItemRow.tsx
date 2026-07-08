"use client";

import { useTransition } from "react";
import { deleteScheduleItem } from "./actions";

export function ScheduleItemRow({
  id,
  timeLabel,
  title,
  sort,
}: {
  id: string;
  timeLabel: string | null;
  title: string;
  sort: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-[var(--muted)]">#{sort}</span>
        {timeLabel && (
          <span className="font-mono text-sm font-semibold text-vote">
            {timeLabel}
          </span>
        )}
        <span className="text-sm">{title}</span>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("삭제할까요?"))
            startTransition(() => void deleteScheduleItem(id));
        }}
        className="text-sm text-[var(--muted)] hover:text-red-500"
      >
        {pending ? "..." : "삭제"}
      </button>
    </div>
  );
}
