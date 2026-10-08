"use client";

import { useRef, useState, useTransition } from "react";

// 점수 입력 — 슬라이더. 배점이 15~35 로 제각각이라 숫자 입력은 심사위원이
// 30팀 × 5기준 = 150 번 키패드를 두드려야 했다. 슬라이더는 배점과 무관하게
// 조작량이 같다.
//
// "미채점"과 "0점"을 구분해야 하므로 값은 number | "" 로 들고,
// 폼에는 hidden input 으로 넘긴다(미채점이면 빈 문자열 → 제출 시 검증에 걸림).
// 손잡이 위치만으로는 둘이 같아 보이므로 오른쪽 숫자를 "—" 로 구분해 보여준다.
//
// 오른쪽 숫자를 누르면 입력칸으로 바뀌어 점수를 직접 칠 수 있다(휴대폰은 숫자
// 키패드). 슬라이더로 정확한 값을 맞추기 어렵다는 현장 요청. 입력칸을 벗어나거나
// Enter 를 누르면 0~만점 정수로 다듬어 반영하고, 비우거나 Esc 를 누르면 원래
// 값을 유지한다. Enter 가 폼 제출(점수 저장)로 새지 않게 막는다.
function ScoreSlider({
  name,
  max,
  value,
  onChange,
}: {
  name: string;
  max: number;
  value: number | "";
  onChange: (next: number) => void;
}) {
  // 슬라이더 위에서 시작한 조작이 "누른 것"인지 "스크롤"인지 구분한다.
  // 세로로 튕기면 브라우저가 스크롤을 가져가며 pointercancel 을 쏘므로,
  // 그때는 아래 pointerup 확정을 건너뛴다(미채점이 0 점으로 굳는 것 방지).
  const pressing = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const scored = value !== "";

  function startEdit() {
    setDraft(scored ? String(value) : "");
    setEditing(true);
  }
  function commitEdit() {
    setEditing(false);
    const t = draft.trim();
    if (t === "") return; // 비우면 원래 값 유지
    const n = Number(t);
    if (!Number.isFinite(n)) return;
    onChange(Math.max(0, Math.min(max, Math.round(n))));
  }
  const pct = scored ? (value / max) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={value} />
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={scored ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => {
            pressing.current = true;
          }}
          onPointerCancel={() => {
            pressing.current = false;
          }}
          // 0 점을 주려고 맨 왼쪽을 눌러도 값이 그대로면 change 가 안 뜬다.
          // 눌러서 끝낸 조작에 한해 현재 값을 확정해 "미채점" 에서 빠져나오게 한다.
          onPointerUp={(e) => {
            if (!pressing.current) return;
            pressing.current = false;
            onChange(Number(e.currentTarget.value));
          }}
          aria-label="점수"
          aria-valuetext={scored ? `${value}점` : "미채점"}
          className="score-range"
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />
        <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-[var(--muted)]">
          <span>0</span>
          <span>{max}</span>
        </div>
      </div>
      {editing ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          step={1}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // 폼 제출(점수 저장)로 새지 않게
              commitEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          aria-label={`점수 직접 입력 (0~${max}점)`}
          className="input !h-9 !w-14 flex-none !px-1 text-center text-lg font-bold tabular-nums"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          title="눌러서 점수 직접 입력"
          aria-label={`${scored ? `${value}점` : "미채점"}, 눌러서 직접 입력`}
          className={`h-9 w-14 flex-none rounded-md border border-dashed border-[var(--line-strong)] text-center text-lg font-bold tabular-nums transition hover:border-navy hover:bg-paper ${
            scored ? "text-ink" : "text-[var(--line)]"
          }`}
        >
          {scored ? value : "—"}
        </button>
      )}
    </div>
  );
}

type Criterion = {
  id: string;
  name: string;
  max_score: number;
  weight: number;
  description: string | null;
};
type Existing = { criteria_id: string; score: number; comment: string | null };

export function ScoreCard({
  projectId,
  order = null,
  teamName,
  title,
  criteria,
  existing,
  action,
  withComment = true,
}: {
  projectId: string;
  // 발표 순번(현장 시간표 번호). 팀장이 발표를 들으며 지금 몇 번째 팀인지
  // 바로 찾도록 카드 왼쪽 위에 배지로 보여준다.
  order?: number | null;
  teamName: string;
  title: string;
  criteria: Criterion[];
  existing: Existing[];
  action: (
    projectId: string,
    formData: FormData
  ) => Promise<{ ok?: boolean; error?: string } | void>;
  withComment?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(existing.length > 0);
  const [error, setError] = useState<string | null>(null);

  // 합계를 보여주려면 카드가 값을 알아야 해서 슬라이더 상태를 여기서 들고 있는다.
  const [scores, setScores] = useState<Record<string, number | "">>(() =>
    Object.fromEntries(
      criteria.map((c) => [
        c.id,
        existing.find((e) => e.criteria_id === c.id)?.score ?? "",
      ])
    )
  );
  const commentOf = existing.find((e) => e.comment)?.comment ?? "";

  // 배점 합계는 데이터에서 계산한다(현재 100 이지만 기준이 바뀌면 따라간다).
  const totalMax = criteria.reduce((s, c) => s + c.max_score, 0);
  const total = criteria.reduce((s, c) => {
    const v = scores[c.id];
    return s + (typeof v === "number" ? v : 0);
  }, 0);
  const allScored = criteria.every((c) => scores[c.id] !== "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    // 슬라이더 값은 hidden input 이라 브라우저 required 가 안 걸린다.
    if (!allScored) {
      setError("모든 항목을 채점해 주세요.");
      return;
    }
    startTransition(async () => {
      // 서버 액션이 "응답"이 아니라 "예외"로 실패하는 경우가 있다 — 와이파이가
      // 끊기거나, 화면을 열어 둔 사이 새 버전이 배포돼 이 화면의 액션을 서버가
      // 못 찾을 때. 잡지 않으면 트랜지션 밖으로 던져져 error.tsx 로 화면이
      // 통째로 넘어가고, 팀장이 슬라이더로 매긴 점수가 전부 사라진다.
      // 여기서 잡아 카드와 입력값을 그대로 두고 다시 누르게 한다.
      try {
        const res = await action(projectId, fd);
        if (res?.error) setError(res.error);
        else {
          setSaved(true);
          setOpen(false);
        }
      } catch {
        setError(
          "저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. 계속 안 되면 새로고침한 뒤 다시 입력해 주세요."
        );
      }
    });
  }

  return (
    <div className="card !p-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            {order != null && (
              <span className="flex-none rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                {order}번
              </span>
            )}
            <span className="min-w-0 truncate">{teamName}</span>
          </p>
          <p className="font-semibold">{title}</p>
        </div>
        <span className="flex flex-none items-center gap-2">
          <span className={`chip ${saved ? "border-team text-team" : ""}`}>
            {saved ? "✓ 채점됨" : "미채점"}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <form onSubmit={onSubmit} className="border-t border-[var(--line)] p-4">
          <p className="mb-2 text-[11px] text-[var(--muted)]">
            슬라이더를 움직이거나, 오른쪽 숫자 칸을 눌러 점수를 직접 입력하세요.
          </p>
          <div className="flex flex-col gap-3">
            {criteria.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-[var(--line)] p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <label className="text-sm font-semibold">
                    {c.name}{" "}
                    <span className="text-xs font-bold text-navy">
                      {c.weight}%
                    </span>
                  </label>
                  <span className="flex-none text-[10px] text-[var(--muted)]">
                    최대 {c.max_score}점
                  </span>
                </div>
                {c.description && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {c.description}
                  </p>
                )}
                <div className="mt-2.5">
                  <ScoreSlider
                    name={`c_${c.id}`}
                    max={c.max_score}
                    value={scores[c.id] ?? ""}
                    onChange={(next) =>
                      setScores((prev) => ({ ...prev, [c.id]: next }))
                    }
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
              <span className="text-sm text-[var(--muted)]">합계</span>
              <span
                className={`text-xl font-bold tabular-nums ${
                  allScored ? "text-team" : "text-ink"
                }`}
              >
                {total}
                <span className="text-sm font-normal text-[var(--muted)]">
                  {" "}
                  / {totalMax}
                </span>
              </span>
            </div>
            {withComment && (
              <textarea
                name="comment"
                rows={2}
                defaultValue={commentOf}
                placeholder="심사 코멘트 (선택)"
                className="input"
              />
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button disabled={pending} className="btn-primary mt-3 w-full">
            {pending ? "저장 중..." : "점수 저장"}
          </button>
        </form>
      )}
    </div>
  );
}
