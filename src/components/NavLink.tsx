"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 상단 내비 링크. 현재 경로면 골드 밑줄로 표시한다.
// tone: 일반(muted) / 운영(admin) 색상 구분.
export function NavLink({
  href,
  label,
  className = "",
  tone = "muted",
}: {
  href: string;
  label: string;
  className?: string;
  tone?: "muted" | "admin";
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${navItem(active, tone)} ${className}`}
    >
      {label}
      {active && <span className={navUnderline} />}
    </Link>
  );
}

// 활성 링크 아래 골드 밑줄. NoticeNavLink 와 모양을 공유한다.
export const navUnderline =
  "absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gold-bright";

export function navItem(active: boolean, tone: "muted" | "admin" = "muted") {
  const color =
    tone === "admin"
      ? "text-admin hover:text-navy"
      : active
        ? "text-ink"
        : "text-[var(--muted)] hover:text-ink";
  return `relative inline-flex items-center px-1.5 py-2.5 transition ${
    active ? "font-semibold" : "font-medium"
  } ${color}`;
}
