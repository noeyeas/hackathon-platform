"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecruitPost } from "./actions";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/EmptyState";

type Post = {
  id: string;
  title: string;
  body: string | null;
  positions: string[] | null;
  kind: string;
  author_name: string | null;
  contact: string | null;
  team: { name: string; status: string } | null;
};

export function RecruitTabs({
  teamPosts,
  individualPosts,
  isAdmin = false,
}: {
  teamPosts: Post[];
  individualPosts: Post[];
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<"team" | "individual">("team");
  const [query, setQuery] = useState("");
  const allPosts = tab === "team" ? teamPosts : individualPosts;

  const q = query.trim().toLowerCase();
  const posts = q
    ? allPosts.filter((p) =>
        [p.title, p.body, ...(p.positions ?? [])]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      )
    : allPosts;

  const empty = q
    ? { icon: "🔍", title: "검색 결과가 없습니다.", desc: "다른 키워드로 찾아보세요." }
    : tab === "team"
      ? {
          icon: "🧑‍🤝‍🧑",
          title: "팀원을 모집하는 팀이 아직 없습니다.",
          desc: "곧 새로운 모집 글이 올라옵니다.",
        }
      : {
          icon: "🙋",
          title: "팀을 구하는 개인이 아직 없습니다.",
          desc: "곧 새로운 참가 글이 올라옵니다.",
        };

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

      {/* 검색 */}
      <div className="relative mt-4">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          🔍
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·역할·소개로 검색"
          className="input pl-9"
          aria-label="모집 글 검색"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {posts.length === 0 ? (
          <EmptyState icon={empty.icon} title={empty.title} desc={empty.desc} />
        ) : (
          posts.map((p) => <PostCard key={p.id} p={p} isAdmin={isAdmin} />)
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

function PostCard({ p, isAdmin }: { p: Post; isAdmin: boolean }) {
  const isTeam = p.kind !== "individual";
  const team = p.team;
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, node } = useToast();

  function remove() {
    if (pending) return;
    if (!confirm("이 모집 글을 삭제할까요?")) return;
    startTransition(async () => {
      const res = await deleteRecruitPost(p.id);
      if (res?.error) {
        toast(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="card">
      {node}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`chip ${
              isTeam ? "border-team text-team" : "border-admin text-admin"
            }`}
          >
            {isTeam ? "팀원 구함" : "팀 구함"}
          </span>
        </div>
        <div className="flex flex-none items-center gap-3">
          {isTeam && team?.status === "locked" && (
            <span className="text-xs text-[var(--muted)]">마감된 팀</span>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="text-xs text-[var(--muted)] hover:text-red-500 disabled:opacity-50"
            >
              삭제
            </button>
          )}
        </div>
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
