"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 상단 내비 링크. 현재 경로면 활성 표시(pill 강조 + aria-current)를 준다.
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

  const base =
    tone === "admin"
      ? active
        ? "bg-gray-100 font-semibold text-admin"
        : "font-medium text-admin hover:bg-gray-100"
      : active
        ? "bg-gray-100 font-medium text-ink"
        : "text-[var(--muted)] hover:bg-gray-100 hover:text-ink";

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 transition ${base} ${className}`}
    >
      {label}
    </Link>
  );
}
