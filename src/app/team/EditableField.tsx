"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTeamField } from "./actions";

// 표시/편집을 한 자리에서 토글하는 인라인 수정 필드 (팀 소개·팀원 구성)
export function EditableField({
  label,
  field,
  value,
  editable,
  multiline = false,
  placeholder,
}: {
  label: string;
  field: "tagline" | "members_note";
  value: string | null;
  editable: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateTeamField(field, val);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setVal(value ?? "");
    setError(null);
    setEditing(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {editable && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-vote hover:underline"
          >
            {value ? "수정" : "추가"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-1">
          {multiline ? (
            <textarea
              value={val}
              onChange={(e) => setVal(e.target.value)}
              rows={3}
              className="input"
              placeholder={placeholder}
              autoFocus
            />
          ) : (
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="input"
              placeholder={placeholder}
              autoFocus
            />
          )}
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="btn-primary !px-3 !py-1.5 text-xs"
            >
              {pending ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={cancel}
              disabled={pending}
              className="text-xs text-[var(--muted)] hover:text-ink"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm">
          {value || <span className="text-[var(--muted)]">비어 있음</span>}
        </p>
      )}
    </div>
  );
}
