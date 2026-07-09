"use client";

import { useState, useTransition } from "react";
import { updateMilestone, deleteMilestone } from "./actions";
import { toLocalInput } from "@/lib/format";

export function MilestoneAdminRow({
  id,
  label,
  targetAt,
}: {
  id: string;
  label: string;
  targetAt: string;
}) {
  const [labelText, setLabelText] = useState(label);
  const [dateText, setDateText] = useState(() => toLocalInput(targetAt));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const base = toLocalInput(targetAt);
  const dirty = labelText !== label || dateText !== base;

  function save() {
    setSaved(false);
    startTransition(async () => {
      const res = await updateMilestone(id, labelText, dateText);
      if (!res?.error) setSaved(true);
    });
  }

  function remove() {
    if (!confirm("이 마일스톤을 삭제할까요?")) return;
    startTransition(() => void deleteMilestone(id));
  }

  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={labelText}
          onChange={(e) => {
            setLabelText(e.target.value);
            setSaved(false);
          }}
          className="input min-w-[7rem] flex-1 text-sm"
          placeholder="이름 (예: 신청 마감)"
        />
        <input
          type="datetime-local"
          value={dateText}
          suppressHydrationWarning
          onChange={(e) => {
            setDateText(e.target.value);
            setSaved(false);
          }}
          className="input text-sm"
        />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {pending ? "저장 중…" : "수정 저장"}
        </button>
        {saved && !dirty && <span className="text-xs text-team">저장됨</span>}
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="ml-auto text-sm text-[var(--muted)] hover:text-red-500"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
