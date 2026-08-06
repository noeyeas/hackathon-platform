"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TeamName } from "@/components/TeamName";
import { EmptyState } from "@/components/EmptyState";
import {
  PROJECT_TRACKS,
  PROJECT_TRACK_LABEL,
  type ProjectTrack,
} from "@/lib/types";

export type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  track: ProjectTrack | null;
  teamName: string;
  membersNote: string | null;
  views: number;
  likes: number;
  submittedAt: string;
  /** 방문(세션)마다 고정된 무작위 순서. 특정 팀이 늘 위에 오지 않도록. */
  shuffle: number;
  /** 결과 공개 후에만 채워진다 — 0=대상, 1=최우수, 2=우수 */
  awardRank: number | null;
  awardLabel: string | null;
};

type SortKey = "award" | "popular" | "views" | "recent" | "shuffle";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "award", label: "수상작 먼저" },
  { value: "shuffle", label: "무작위" },
  { value: "popular", label: "좋아요순" },
  { value: "views", label: "조회순" },
  { value: "recent", label: "최신순" },
];

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function GalleryBrowser({
  items,
  hasAwards,
}: {
  items: GalleryItem[];
  hasAwards: boolean;
}) {
  const [track, setTrack] = useState<ProjectTrack | "all">("all");
  const [query, setQuery] = useState("");
  // 결과가 공개되기 전에는 수상 정보가 없으므로 무작위가 기본이다.
  const [sort, setSort] = useState<SortKey>(hasAwards ? "award" : "shuffle");

  const tabs = useMemo(() => {
    const counts = new Map<ProjectTrack, number>();
    for (const p of items)
      if (p.track) counts.set(p.track, (counts.get(p.track) ?? 0) + 1);
    return PROJECT_TRACKS.filter((t) => counts.has(t.value)).map((t) => ({
      ...t,
      count: counts.get(t.value)!,
    }));
  }, [items]);

  const shown = useMemo(() => {
    const q = normalize(query);
    const filtered = items.filter((p) => {
      if (track !== "all" && p.track !== track) return false;
      if (!q) return true;
      return (
        normalize(p.title).includes(q) ||
        normalize(p.teamName).includes(q) ||
        normalize(p.description ?? "").includes(q)
      );
    });

    const by: Record<SortKey, (a: GalleryItem, b: GalleryItem) => number> = {
      // 수상작을 앞으로, 나머지는 세션 무작위 순서를 유지한다.
      award: (a, b) =>
        (a.awardRank ?? Number.MAX_SAFE_INTEGER) -
          (b.awardRank ?? Number.MAX_SAFE_INTEGER) || a.shuffle - b.shuffle,
      popular: (a, b) => b.likes - a.likes || b.views - a.views,
      views: (a, b) => b.views - a.views || b.likes - a.likes,
      recent: (a, b) => b.submittedAt.localeCompare(a.submittedAt),
      shuffle: (a, b) => a.shuffle - b.shuffle,
    };
    return filtered.sort(by[sort]);
  }, [items, track, query, sort]);

  const sorts = hasAwards ? SORTS : SORTS.filter((s) => s.value !== "award");

  return (
    <div className="flex flex-col gap-5">
      {/* ── 검색 ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">팀명·서비스 검색</span>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="팀명·서비스 검색"
            className="input !pl-9"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <span className="sr-only sm:not-sr-only">정렬</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input !w-auto !py-2"
          >
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── 주제 필터 ── */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTrack("all")}
            aria-pressed={track === "all"}
            className={`filter-chip ${track === "all" ? "filter-chip-on" : ""}`}
          >
            전체
            <span className="text-xs opacity-70">{items.length}</span>
          </button>
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTrack(t.value)}
              aria-pressed={track === t.value}
              className={`filter-chip ${
                track === t.value ? "filter-chip-on" : ""
              }`}
            >
              {t.label}
              <span className="text-xs opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 카드 그리드 ── */}
      {shown.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="조건에 맞는 제출작이 없습니다."
          desc="검색어를 지우거나 다른 주제를 눌러 보세요."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <Link
              key={p.id}
              href={`/gallery/${p.id}`}
              className="panel group flex flex-col transition hover:border-navy/40 hover:shadow-sm"
            >
              {/* 썸네일 자리 — 이미지가 없어 제목 첫 글자를 크게 얹는다 */}
              <div className="tile-pattern relative flex aspect-[16/10] items-center justify-center border-b border-[var(--line)] bg-paper">
                <span className="font-title text-4xl font-bold text-navy/25">
                  {p.title.trim().charAt(0) || "?"}
                </span>
                {p.awardLabel && (
                  <span
                    className={`absolute left-3 top-3 ${
                      p.awardRank === 0 ? "badge-gold" : "badge-navy"
                    }`}
                  >
                    {p.awardLabel}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="text-xs font-semibold text-gold-ink">
                  {p.track ? PROJECT_TRACK_LABEL[p.track] : "주제 미지정"}
                </p>
                <h3 className="mt-1 font-bold leading-snug text-ink">
                  {p.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                  {p.description ?? "설명 없음"}
                </p>

                <div className="mt-4 flex items-center gap-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                  <TeamName name={p.teamName} membersNote={p.membersNote} />
                  <span className="ml-auto flex items-center gap-2.5 tabular-nums">
                    <span>👁 {p.views}</span>
                    <span>♥ {p.likes}</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
