"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import {
  NOTICE_CATEGORIES,
  NOTICE_CATEGORY_LABEL,
  type NoticeCategory,
} from "@/lib/types";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  category: NoticeCategory;
  created_at: string;
};

// 공지는 "며칠 전"보다 며칠자인지가 중요해서 절대 날짜로 고정한다.
function longDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Seoul",
    })
    .replace(/\s/g, "")
    .replace(/\.$/, "");
}

function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
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
  );
}

export default function NoticeList({ list }: { list: Announcement[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NoticeCategory | "all">("all");

  // 실제로 공지가 있는 분류만 필터로 노출한다 — 빈 탭을 누르는 일이 없도록.
  const tabs = useMemo(() => {
    const counts = new Map<NoticeCategory, number>();
    for (const a of list)
      counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    return NOTICE_CATEGORIES.filter((c) => counts.has(c.value)).map((c) => ({
      ...c,
      count: counts.get(c.value)!,
    }));
  }, [list]);

  if (!list.length) {
    return (
      <EmptyState
        icon="📭"
        title="아직 등록된 공지가 없습니다."
        desc="새로운 소식이 올라오면 이곳에 표시됩니다."
      />
    );
  }

  const shown =
    filter === "all" ? list : list.filter((a) => a.category === filter);
  const pinned = shown.filter((a) => a.pinned);
  const rest = shown.filter((a) => !a.pinned);

  const toggle = (id: string) =>
    setOpenId((cur) => (cur === id ? null : id));

  return (
    <div className="flex flex-col gap-6">
      {/* ── 분류 필터 ── */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`filter-chip ${filter === "all" ? "filter-chip-on" : ""}`}
          >
            전체
            <span className="text-xs opacity-70">{list.length}</span>
          </button>
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              aria-pressed={filter === t.value}
              className={`filter-chip ${
                filter === t.value ? "filter-chip-on" : ""
              }`}
            >
              {t.label}
              <span className="text-xs opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 고정 공지: 네이비 배너 ── */}
      {pinned.map((a) => {
        const open = openId === a.id;
        return (
          <article
            key={a.id}
            className="overflow-hidden rounded-lg bg-navy text-white"
          >
            <button
              type="button"
              onClick={() => toggle(a.id)}
              aria-expanded={open}
              className="flex w-full items-start gap-4 px-5 py-5 text-left sm:px-6"
            >
              <span className="badge-gold mt-1 flex-none">고정</span>
              <span className="min-w-0 flex-1">
                <span className="block font-title text-lg font-bold leading-snug sm:text-xl">
                  {a.title}
                </span>
                {a.body && (
                  <span
                    className={`mt-1.5 block text-sm leading-relaxed text-white/70 ${
                      open ? "whitespace-pre-wrap" : "line-clamp-2"
                    }`}
                  >
                    {a.body}
                  </span>
                )}
              </span>
              <span className="flex flex-none flex-col items-end gap-2 text-xs text-white/60">
                <time dateTime={a.created_at}>{longDate(a.created_at)}</time>
                {a.body && <Chevron open={open} />}
              </span>
            </button>
            {open && a.body && (
              <p className="border-t border-white/15 px-5 py-3 text-xs text-white/60 sm:px-6">
                {fullDateTime(a.created_at)} ·{" "}
                {NOTICE_CATEGORY_LABEL[a.category]}
              </p>
            )}
          </article>
        );
      })}

      {/* ── 일반 공지: 구분선 목록 ── */}
      {rest.length > 0 && (
        <div className="panel divide-y divide-[var(--line)]">
          {rest.map((a) => {
            const open = openId === a.id;
            return (
              <article key={a.id}>
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-paper sm:px-6 sm:py-5"
                >
                  <span className="mt-0.5 w-8 flex-none text-xs font-semibold text-gold-ink sm:w-10">
                    {NOTICE_CATEGORY_LABEL[a.category]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-snug text-ink">
                      {a.title}
                    </span>
                    {a.body && (
                      <span
                        className={`mt-1 block text-sm leading-relaxed text-[var(--muted)] ${
                          open ? "whitespace-pre-wrap" : "line-clamp-1"
                        }`}
                      >
                        {a.body}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-none items-center gap-2 text-xs text-[var(--muted)]">
                    <time dateTime={a.created_at} className="max-sm:hidden">
                      {longDate(a.created_at)}
                    </time>
                    {a.body && <Chevron open={open} />}
                  </span>
                </button>
                {open && a.body && (
                  <p className="px-4 pb-4 text-xs text-[var(--muted)] sm:px-6 sm:pl-[4.5rem]">
                    {fullDateTime(a.created_at)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!shown.length && (
        <EmptyState
          icon="🔍"
          title="이 분류에는 공지가 없습니다."
          desc="다른 분류를 눌러 보세요."
        />
      )}
    </div>
  );
}
