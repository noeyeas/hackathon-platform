"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/notice", label: "공지", icon: "📢" },
  { href: "/schedule", label: "일정", icon: "🗓️" },
  { href: "/dday", label: "D-day", icon: "⏱️" },
];

// 화면 오른쪽에 고정되어 스크롤을 따라오는 미니 리모컨
export function RemoteControl() {
  const path = usePathname();

  // 프로젝터 화면(/stage)에서는 숨김
  if (path === "/stage") return null;

  return (
    <nav
      aria-label="바로가기"
      className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-white/90 p-1.5 shadow-lg backdrop-blur sm:right-5"
    >
      {ITEMS.map((it) => {
        const active = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex w-14 flex-col items-center gap-0.5 rounded-xl px-1 py-2.5 text-[11px] font-semibold transition ${
              active
                ? "bg-vote text-white"
                : "text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
            }`}
          >
            <span className="text-lg leading-none">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
