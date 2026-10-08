"use client";

import { useEffect, useState } from "react";
import { ScoreCard } from "../ScoreCard";
import { ScoreProgress } from "@/components/ScoreProgress";

// 연습 화면의 카드 목록. 실제 /vote 의 ScoreCard 를 그대로 쓰고, 서버 액션
// 대신 브라우저 저장소에 저장하는 함수를 넘긴다 — 화면·조작은 실제와 같고
// 저장 위치만 다르다.

export type DemoProject = {
  id: string;
  order: number | null;
  title: string;
  teamName: string;
};
type Criterion = {
  id: string;
  name: string;
  max_score: number;
  weight: number;
  description: string | null;
};
type Saved = Record<string, Record<string, number>>; // projectId → criteriaId → score

const STORAGE_KEY = "kw-vote-demo-v1";

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

export function DemoBoard({
  projects,
  criteria,
}: {
  projects: DemoProject[];
  criteria: Criterion[];
}) {
  // 저장소는 브라우저에서만 읽을 수 있다. 읽기 전에 카드를 그리면 카드가
  // 빈 값으로 초기화돼 버리므로(ScoreCard 는 첫 렌더 값만 쓴다) 읽은 뒤에 그린다.
  const [saved, setSaved] = useState<Saved | null>(null);
  const [round, setRound] = useState(0); // 초기화할 때 카드를 새로 만들기 위한 키

  useEffect(() => {
    setSaved(load());
  }, []);

  async function practiceSave(projectId: string, formData: FormData) {
    const scores: Record<string, number> = {};
    for (const c of criteria) {
      const raw = formData.get(`c_${c.id}`);
      const n = Number(raw);
      if (raw === null || raw === "" || !Number.isFinite(n))
        return { error: "모든 항목을 채점해 주세요." };
      scores[c.id] = Math.max(0, Math.min(c.max_score, Math.round(n)));
    }
    // 실제 저장처럼 잠깐 "저장 중..." 이 보이게 한다.
    await new Promise((r) => setTimeout(r, 400));
    setSaved((prev) => {
      const next = { ...(prev ?? {}), [projectId]: scores };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 저장소가 막힌 브라우저(시크릿 모드 등)에서도 화면 안에서는 동작한다.
      }
      return next;
    });
    return { ok: true };
  }

  function reset() {
    if (!confirm("연습한 점수를 모두 지우고 처음부터 다시 할까요?")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSaved({});
    setRound((r) => r + 1);
  }

  const done = saved
    ? projects.filter((p) => {
        const s = saved[p.id];
        return s && criteria.every((c) => typeof s[c.id] === "number");
      }).length
    : 0;

  return (
    <>
      <div className="mt-4 rounded-md border border-gold/30 bg-gold-soft px-4 py-3 text-sm text-gold-ink">
        <b>연습용 화면입니다.</b> 저장해도 실제 점수에 반영되지 않고, 이 기기의
        브라우저에만 남습니다. 실제 평가는 팀장 계정으로 로그인한 뒤 메뉴의
        &lsquo;평가&rsquo;에서 합니다(실제 화면에서는 자기 팀이 빠집니다).
      </div>

      <ScoreProgress done={done} total={projects.length} />

      <div className="mt-3 flex justify-end">
        <button type="button" onClick={reset} className="btn-ghost text-sm">
          연습 초기화
        </button>
      </div>

      {saved === null ? (
        <p className="card mt-4 text-center text-sm text-[var(--muted)]">
          불러오는 중…
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {projects.map((p) => (
            <ScoreCard
              key={`${round}-${p.id}`}
              projectId={p.id}
              order={p.order}
              teamName={p.teamName}
              title={p.title}
              criteria={criteria}
              existing={Object.entries(saved[p.id] ?? {}).map(
                ([criteria_id, score]) => ({ criteria_id, score, comment: null })
              )}
              action={practiceSave}
              withComment={false}
            />
          ))}
          {!projects.length && (
            <p className="card text-center text-[var(--muted)]">
              연습할 제출작이 없습니다.
            </p>
          )}
        </div>
      )}
    </>
  );
}
