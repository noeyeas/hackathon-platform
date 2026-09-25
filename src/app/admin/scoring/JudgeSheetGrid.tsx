"use client";

import { useState } from "react";
import { setJudgeSheetScore, setPresentationScore, setAbsentCount } from "../actions";
import { JUDGE_SHEET_MAX, PRESENTATION_MAX } from "@/lib/types";

// 회수한 종이 채점표를 옮겨 적는 표(0059). 한 행 = 한 팀, 심사위원 칸마다
// 그 심사위원 채점표의 항목 합계(0~90)를 적는다. 평균·심사 점수·순위는
// 타이핑하는 즉시 이 화면에서 다시 계산된다 — 운영진이 계산기를 쓰지 않는다.
//
// 저장은 칸을 벗어날 때(blur) 또는 Enter. 40팀 × 심사위원 수만큼 칸이 있어
// 칸마다 저장 버튼을 누르게 하면 운영이 불가능하다.
//
// 빈 칸은 0 점이 아니라 "그 심사위원은 이 팀을 채점하지 않았다"다 — 평균에서
// 아예 빠진다. 심사위원 2명만 온 날에도 남은 칸 때문에 점수가 깎이지 않는다.

export type SheetJudge = { email: string; name: string };
export type SheetRow = {
  teamId: string;
  label: string;
  presentation: number;
  absent: number;
};
export type SheetCell = { team_id: string; judge_email: string; score: number };

const key = (teamId: string, email: string) => `${teamId}|${email}`;

// 빈 칸·숫자가 아닌 입력은 null(미입력). 0 점과 구분해야 평균이 맞는다.
function num(raw: string | undefined): number | null {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);

export function JudgeSheetGrid({
  round,
  judges,
  rows,
  cells: initialCells,
  showRank = false,
  rankBadge,
}: {
  round: "final" | "mid";
  judges: SheetJudge[];
  rows: SheetRow[];
  cells: SheetCell[];
  // 중간발표는 이 표가 점수의 전부라 순위를 여기서 바로 보여 준다. 본선은
  // 팀 상호평가·주민투표가 더 붙으므로 순위는 아래 집계표가 정한다.
  showRank?: boolean;
  rankBadge?: string;
}) {
  const [cells, setCells] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialCells.map((c) => [key(c.team_id, c.judge_email), String(c.score)])
    )
  );
  const [pres, setPres] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.teamId, String(r.presentation)]))
  );
  const [absent, setAbsent] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.teamId, String(r.absent)]))
  );

  const presMax = PRESENTATION_MAX[round];

  // 팀별 계산 — 평균(입력된 장수로만), 심사 점수(100점), 입력 장수.
  const calc = rows.map((r) => {
    const scores = judges
      .map((j) => num(cells[key(r.teamId, j.email)]))
      .filter((v): v is number => v !== null);
    const avg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;
    const p = Math.max(0, Math.min(presMax, num(pres[r.teamId]) ?? 0));
    const a = Math.max(0, num(absent[r.teamId]) ?? 0);
    const participation = round === "final" ? Math.max(5 - a, 0) : 0;
    return {
      teamId: r.teamId,
      sheets: scores.length,
      avg,
      total: (avg ?? 0) + p + participation,
    };
  });
  const byTeam = new Map(calc.map((c) => [c.teamId, c]));

  // 순위 — 점수 내림차순. 동점은 표에 나온 순서(조 번호순)를 유지한다.
  //
  // 채점표가 한 장도 없는 팀은 순위에서 뺀다. 본선 참여도는 5점 만점에서
  // 불참 인원만큼 깎는 방식이라(0052) 아무것도 입력하지 않은 팀도 5점으로
  // 잡히는데, 그대로 두면 입력 도중의 순위가 미채점 팀으로 뒤섞인다.
  const rankOf = new Map(
    [...calc]
      .filter((c) => c.sheets > 0)
      .sort((a, b) => b.total - a.total)
      .map((c, i) => [c.teamId, i + 1])
  );

  const enteredTeams = calc.filter((c) => c.sheets > 0).length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        <span>
          심사표 입력 <b className="text-ink">{enteredTeams}</b>/{rows.length}팀
        </span>
        <span>
          심사위원 {judges.length}명 · 칸을 벗어나면(Tab·Enter) 바로 저장되고
          평균·점수가 즉시 다시 계산됩니다
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl min-w-[640px]">
          <thead>
            <tr>
              <th>팀</th>
              {judges.map((j) => (
                <th key={j.email} className="!text-right">
                  {j.name}
                </th>
              ))}
              <th className="!text-right">평균</th>
              <th className="!text-right">발표 (0~{presMax})</th>
              {round === "final" && <th className="!text-right">불참</th>}
              <th className="!text-right">점수</th>
              {showRank && <th>순위</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const c = byTeam.get(r.teamId)!;
              // 미채점 팀은 순위도 점수도 비워 둔다 — 아직 값이 없는 것과
              // 0 점인 것은 다르다.
              const rank = rankOf.get(r.teamId) ?? null;
              return (
                <tr
                  key={r.teamId}
                  className={showRank && rank === 1 ? "bg-gold-soft/40" : ""}
                >
                  <td className="whitespace-nowrap">{r.label}</td>
                  {judges.map((j) => (
                    <td key={j.email} className="num">
                      <NumCell
                        value={cells[key(r.teamId, j.email)] ?? ""}
                        onChange={(v) =>
                          setCells((prev) => ({
                            ...prev,
                            [key(r.teamId, j.email)]: v,
                          }))
                        }
                        max={JUDGE_SHEET_MAX}
                        step={0.1}
                        allowEmpty
                        label={`${r.label} · ${j.name} 채점표 합계`}
                        hint={`채점표 4항목 합계 (0~${JUDGE_SHEET_MAX}점) · 비우면 미채점`}
                        commit={(raw) =>
                          setJudgeSheetScore(
                            round,
                            r.teamId,
                            j.email,
                            raw === "" ? null : Number(raw)
                          )
                        }
                      />
                    </td>
                  ))}
                  <td className="num font-semibold">
                    {c.avg === null ? (
                      <span className="text-[var(--line-strong)]">—</span>
                    ) : (
                      <span title={`채점표 ${c.sheets}장 평균`}>
                        {fmt(c.avg)}
                        <span className="ml-1 text-[10px] font-normal text-[var(--muted)]">
                          ({c.sheets})
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="num">
                    <NumCell
                      value={pres[r.teamId] ?? "0"}
                      onChange={(v) =>
                        setPres((prev) => ({ ...prev, [r.teamId]: v }))
                      }
                      max={presMax}
                      step={1}
                      label={`${r.label} 발표 점수`}
                      hint={`발표 점수 (0~${presMax}점, 운영진 입력)`}
                      commit={(raw) =>
                        setPresentationScore(r.teamId, round, Number(raw || 0))
                      }
                    />
                  </td>
                  {round === "final" && (
                    <td className="num">
                      <NumCell
                        value={absent[r.teamId] ?? "0"}
                        onChange={(v) =>
                          setAbsent((prev) => ({ ...prev, [r.teamId]: v }))
                        }
                        max={99}
                        step={1}
                        label={`${r.label} 불참 인원`}
                        hint="불참 인원 (인당 1점 감점, 참여도 5점 만점)"
                        commit={(raw) => setAbsentCount(r.teamId, Number(raw || 0))}
                      />
                    </td>
                  )}
                  <td className="num font-bold text-navy">
                    {c.sheets === 0 ? (
                      <span
                        className="font-normal text-[var(--line-strong)]"
                        title="채점표가 아직 한 장도 입력되지 않았습니다"
                      >
                        —
                      </span>
                    ) : (
                      fmt(c.total)
                    )}
                  </td>
                  {showRank && (
                    <td className="whitespace-nowrap">
                      {rank === null ? (
                        <span className="text-[var(--line-strong)]">—</span>
                      ) : (
                        <>
                          <span className="mr-2 font-bold tabular-nums">
                            {rank}
                          </span>
                          {rank === 1 && rankBadge && (
                            <span className="badge-gold">{rankBadge}</span>
                          )}
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// 표 한 칸. 값은 부모가 들고 있고(합계·순위를 즉시 계산해야 하므로) 저장
// 상태만 여기서 관리한다. blur·Enter 로 저장하고, 실패하면 빨간 테두리로
// 남겨 둔다 — 자동 저장이라 실패를 놓치면 점수가 조용히 사라진다.
function NumCell({
  value,
  onChange,
  commit,
  max,
  step,
  label,
  hint,
  allowEmpty = false,
}: {
  value: string;
  onChange: (next: string) => void;
  commit: (raw: string) => Promise<{ error?: string } | { ok: true }>;
  max: number;
  step: number;
  label: string;
  hint: string;
  allowEmpty?: boolean;
}) {
  const [saved, setSaved] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const raw = value.trim();
    if (raw === saved.trim()) return;
    if (raw === "" && !allowEmpty) {
      onChange(saved);
      return;
    }
    setState("saving");
    const res = await commit(raw);
    if (res && "error" in res && res.error) {
      setError(res.error);
      setState("error");
      return;
    }
    setSaved(raw);
    setError(null);
    setState("idle");
  }

  return (
    <input
      type="number"
      min={0}
      max={max}
      step={step}
      inputMode="decimal"
      value={value}
      placeholder={allowEmpty ? "—" : "0"}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => void save()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur(); // blur 에서 저장 — 경로를 하나로 둔다
        }
      }}
      aria-label={label}
      title={error ?? hint}
      className={`input !h-7 !w-16 !px-2 !py-1 text-right text-xs tabular-nums ${
        state === "error" ? "!border-red-500" : ""
      } ${state === "saving" ? "opacity-60" : ""}`}
    />
  );
}
