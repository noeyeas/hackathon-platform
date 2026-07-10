"use client";

import { useState, useTransition } from "react";
import { updateScheduleItem, deleteScheduleItem } from "./actions";

// ISO(UTC) → datetime-local 입력값(현지 시간 "YYYY-MM-DDTHH:mm")
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleAdminRow({
  id,
  when,
  startsAt,
  endsAt,
  title,
  detail,
}: {
  id: string;
  when: string;
  startsAt: string | null;
  endsAt: string | null;
  title: string;
  detail: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [starts, setStarts] = useState(toLocalInput(startsAt));
  const [ends, setEnds] = useState(toLocalInput(endsAt));
  const [name, setName] = useState(title);
  const [text, setText] = useState(detail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateScheduleItem(id, {
        starts_at: starts,
        ends_at: ends,
        title: name,
        detail: text,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
    });
  }

  function cancel() {
    setStarts(toLocalInput(startsAt));
    setEnds(toLocalInput(endsAt));
    setName(title);
    setText(detail ?? "");
    setError(null);
    setEditing(false);
  }

  function remove() {
    if (!confirm("이 일정을 삭제할까요?")) return;
    startTransition(() => void deleteScheduleItem(id));
  }

  if (!editing) {
    return (
      <div className="rounded-lg bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="font-mono text-sm font-semibold text-vote">
              {when}
            </span>
            <span className="truncate text-sm">{title}</span>
          </div>
          <div className="flex flex-none items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-medium text-vote hover:underline"
            >
              수정
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="text-[var(--muted)] hover:text-red-500"
            >
              삭제
            </button>
          </div>
        </div>
        {detail && (
          <p className="mt-1.5 whitespace-pre-wrap text-xs text-[var(--muted)]">
            {detail}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-vote/30 bg-white px-4 py-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">시작 날짜/시간 *</label>
          <input
            type="datetime-local"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">종료일 (선택)</label>
          <input
            type="datetime-local"
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
            className="input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">내용 *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="개회식 & 오리엔테이션"
          />
        </div>
      </div>
      <label className="label mt-3">상세 일정 (선택)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="input resize-none"
        placeholder="여러 줄 입력 가능. 공개 일정표에서 토글로 펼쳐 보여요."
      />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="btn-primary px-3 py-1.5 text-xs"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={cancel}
          className="text-xs text-[var(--muted)] hover:text-ink"
        >
          취소
        </button>
      </div>
    </div>
  );
}
