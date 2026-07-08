"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Dday } from "./Dday";
import { scheduleWhen } from "@/lib/format";

type Notice = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
};
type ScheduleItem = {
  id: string;
  time_label: string | null;
  starts_at: string | null;
  title: string;
};
type Milestone = { id: string; label: string; target_at: string };

const READ_KEY = "notice_read_at";

export function RemoteControl({
  notices,
  schedule,
  milestones,
}: {
  notices: Notice[];
  schedule: ScheduleItem[];
  milestones: Milestone[];
}) {
  const path = usePathname();
  const [hover, setHover] = useState<string | null>(null);
  const [unread, setUnread] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  // 리모컨 D-day 숫자 (1분마다 갱신)
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // 가장 가까운 예정 마일스톤: 남은 D-day 숫자 + 그 마일스톤 이름
  const dday = (() => {
    if (now === null || milestones.length === 0) return null;
    const next = milestones
      .map((m) => ({ m, diff: new Date(m.target_at).getTime() - now }))
      .filter((x) => x.diff > 0)
      .sort((a, b) => a.diff - b.diff)[0];
    if (!next) return { text: "종료", label: null };
    const d = Math.ceil(next.diff / 86400000);
    return { text: d === 0 ? "D-DAY" : `D-${d}`, label: next.m.label };
  })();

  const latest = notices[0]?.created_at ?? null;

  // 안 읽은 공지 판별
  useEffect(() => {
    if (!latest) return setUnread(false);
    const read = localStorage.getItem(READ_KEY);
    setUnread(!read || new Date(latest) > new Date(read));
  }, [latest]);

  function markRead() {
    if (latest) {
      localStorage.setItem(READ_KEY, latest);
      setUnread(false);
    }
  }

  // 프로젝터 화면에서는 숨김
  if (path === "/stage") return null;

  const items = [
    { key: "notice", href: "/notice", label: "공지", icon: "📢", badge: unread },
    { key: "schedule", href: "/schedule", label: "일정", icon: "🗓️", badge: false },
    { key: "dday", href: "/dday", label: "D-day", icon: "⏱️", badge: false },
  ];

  return (
    <nav
      aria-label="바로가기"
      className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-white/90 p-1.5 shadow-lg backdrop-blur sm:right-5"
    >
      {items.map((it) => {
        const active = path === it.href;
        return (
          <div
            key={it.key}
            className="relative"
            onMouseEnter={() => {
              setHover(it.key);
              if (it.key === "notice") markRead();
            }}
            onMouseLeave={() => setHover(null)}
          >
            <Link
              href={it.href}
              className={`relative flex w-14 flex-col items-center gap-0.5 rounded-xl px-1 py-2.5 text-[11px] font-semibold transition ${
                active
                  ? "bg-vote text-white"
                  : "text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
              }`}
            >
              {it.key === "dday" && dday ? (
                <>
                  <span className="text-sm font-extrabold leading-none tabular-nums">
                    {dday.text}
                  </span>
                  <span className="text-center text-[10px] leading-tight">
                    {dday.label ?? it.label}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg leading-none">{it.icon}</span>
                  {it.label}
                </>
              )}
              {it.badge && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              )}
            </Link>

            {/* 호버 미리보기 패널 */}
            {hover === it.key && (
              <div className="absolute right-full top-0 z-40 mr-3 hidden w-80 sm:block">
                <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-4 shadow-xl">
                  {it.key === "notice" && <NoticePanel notices={notices} />}
                  {it.key === "schedule" && (
                    <SchedulePanel schedule={schedule} />
                  )}
                  {it.key === "dday" && <DdayPanel milestones={milestones} />}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function PanelHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-bold">{title}</h3>
      <Link href={href} className="text-xs text-[var(--muted)] hover:text-ink">
        전체 →
      </Link>
    </div>
  );
}

function NoticePanel({ notices }: { notices: Notice[] }) {
  return (
    <div>
      <PanelHead title="📢 공지사항" href="/notice" />
      {notices.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">아직 공지가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notices.slice(0, 5).map((a) => (
            <li key={a.id} className="rounded-xl border border-[var(--line)] p-3">
              <div className="flex items-center gap-2">
                {a.pinned && (
                  <span className="chip border-vote text-vote">고정</span>
                )}
                <p className="font-semibold">{a.title}</p>
              </div>
              {a.body && (
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                  {a.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SchedulePanel({ schedule }: { schedule: ScheduleItem[] }) {
  return (
    <div>
      <PanelHead title="🗓️ 일정표" href="/schedule" />
      {schedule.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">아직 일정이 없습니다.</p>
      ) : (
        <ol className="flex flex-col">
          {schedule.map((it, i) => (
            <li
              key={it.id}
              className={`flex flex-col gap-0.5 py-2.5 ${
                i !== schedule.length - 1 ? "border-b border-[var(--line)]" : ""
              }`}
            >
              <span className="font-mono text-xs font-semibold text-vote">
                {scheduleWhen(it.time_label, it.starts_at)}
              </span>
              <span className="text-sm">{it.title}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DdayPanel({ milestones }: { milestones: Milestone[] }) {
  return (
    <div>
      <PanelHead title="⏱️ D-day" href="/dday" />
      {milestones.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">등록된 마일스톤이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {milestones.map((m) => (
            <Dday key={m.id} label={m.label} targetAt={m.target_at} />
          ))}
        </div>
      )}
    </div>
  );
}
