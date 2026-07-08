"use client";

import Link from "next/link";
import { useState } from "react";

type Post = {
  id: string;
  title: string;
  body: string | null;
  positions: string[] | null;
  kind: string;
  author_name: string | null;
  contact: string | null;
  team: { name: string; invite_code: string; status: string } | null;
};

export function RecruitTabs({
  teamPosts,
  individualPosts,
}: {
  teamPosts: Post[];
  individualPosts: Post[];
}) {
  const [tab, setTab] = useState<"team" | "individual">("team");
  const posts = tab === "team" ? teamPosts : individualPosts;
  const empty =
    tab === "team"
      ? "팀원을 모집하는 팀이 아직 없습니다."
      : "팀을 구하는 개인이 아직 없습니다.";

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <TabButton
          active={tab === "team"}
          onClick={() => setTab("team")}
          label="🧑‍🤝‍🧑 팀원 구함"
          count={teamPosts.length}
        />
        <TabButton
          active={tab === "individual"}
          onClick={() => setTab("individual")}
          label="🙋 팀 구함"
          count={individualPosts.length}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {posts.length === 0 ? (
          <p className="card text-center text-sm text-[var(--muted)]">
            {empty}
          </p>
        ) : (
          posts.map((p) => <PostCard key={p.id} p={p} />)
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-vote text-white"
          : "border border-[var(--line)] bg-white text-[var(--muted)] hover:text-ink"
      }`}
    >
      {label}{" "}
      <span className={active ? "text-white/80" : "text-[var(--muted)]"}>
        ({count})
      </span>
    </button>
  );
}

function PostCard({ p }: { p: Post }) {
  const isTeam = p.kind !== "individual";
  const team = p.team;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`chip ${
              isTeam ? "border-team text-team" : "border-admin text-admin"
            }`}
          >
            {isTeam ? "팀원 구함" : "팀 구함"}
          </span>
          <span className="text-sm font-semibold">
            {isTeam ? team?.name : (p.author_name ?? "익명")}
          </span>
        </div>
        {isTeam && team?.status === "locked" && (
          <span className="text-xs text-[var(--muted)]">마감된 팀</span>
        )}
      </div>

      <h3 className="mt-2 font-bold">{p.title}</h3>

      {p.positions && p.positions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.positions.map((pos) => (
            <span key={pos} className="chip">
              {pos}
            </span>
          ))}
        </div>
      )}

      {p.body && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
          {p.body}
        </p>
      )}

      {isTeam && team?.status !== "locked" && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
          합류하려면{" "}
          <Link href="/team" className="font-semibold text-vote underline">
            팀 페이지
          </Link>
          에서 초대 코드{" "}
          <span className="select-all font-mono font-bold">
            {team?.invite_code}
          </span>{" "}
          입력
        </div>
      )}

      {p.contact && (
        <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
          연락:{" "}
          <span className="select-all font-semibold text-admin">
            {p.contact}
          </span>
        </div>
      )}
    </div>
  );
}
