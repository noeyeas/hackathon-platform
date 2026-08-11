"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";

const ITEMS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/teams", label: "팀 등록" },
  { href: "/admin/scoring", label: "심사 · 점수" },
  { href: "/admin/announcements", label: "공지 발행" },
  { href: "/admin/schedule", label: "홈 타임라인" },
];

// 운영 콘솔 좌측 메뉴. 좁은 화면에서는 가로 스크롤 탭으로 접힌다.
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="lg:w-52 lg:flex-none">
      <div className="lg:sticky lg:top-20">
        <div className="mb-4 hidden items-center gap-2 lg:flex">
          <BrandMark className="h-6 w-6" />
          <span className="font-title text-sm font-bold text-ink">
            운영자 콘솔
          </span>
        </div>

        <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {ITEMS.map((it) => {
            // "/admin" 은 정확히 일치할 때만 활성 — 하위 페이지까지 켜지지 않도록.
            const active =
              it.href === "/admin"
                ? pathname === "/admin"
                : pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <li key={it.href} className="flex-none lg:flex-auto">
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative block whitespace-nowrap rounded-md px-3 py-2 text-sm transition lg:pl-4 ${
                    active
                      ? "bg-navy/[0.06] font-semibold text-ink"
                      : "text-[var(--muted)] hover:bg-paper hover:text-ink"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold-bright max-lg:hidden" />
                  )}
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
