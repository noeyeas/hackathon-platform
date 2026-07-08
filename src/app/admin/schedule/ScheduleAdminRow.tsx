"use client";

import { useState, useTransition } from "react";
import { updateScheduleDetail, deleteScheduleItem } from "./actions";

export function ScheduleAdminRow({
  id,
  when,
  title,
  detail,
}: {
  id: string;
  when: string;
  title: string;
  detail: string | null;
}) {
  const [text, setText] = useState(detail ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = text !== (detail ?? "");

  function save() {
    setSaved(false);
    startTransition(async () => {
      const res = await updateScheduleDetail(id, text);
      if (!res?.error) setSaved(true);
    });
  }

  function remove() {
    if (!confirm("이 일정을 삭제할까요?")) return;
    startTransition(() => void deleteScheduleItem(id));
  }

  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-vote">
            {when}
          </span>
          <span className="text-sm">{title}</span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="text-sm text-[var(--muted)] hover:text-red-500"
        >
          삭제
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={2}
        placeholder="상세 일정 (선택) — 여러 줄 입력 가능. 공개 일정표에서 토글로 펼쳐 보여요."
        className="input mt-2 resize-none text-sm"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {pending ? "저장 중…" : "상세 저장"}
        </button>
        {saved && !dirty && (
          <span className="text-xs text-team">저장됨</span>
        )}
      </div>
    </div>
  );
}
