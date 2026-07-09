"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = { href: string; label: string; accent?: "admin" };

// 모바일(sm 미만) 햄버거 메뉴. 데스크톱 nav 가 숨기는 링크를 모두 담는다.
export function MobileMenu({
  items,
  loggedIn,
}: {
  items: Item[];
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 경로 이동 시 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="메뉴"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
      >
        <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-[var(--line)] bg-white p-1 shadow-lg">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`block rounded-lg px-3 py-2 text-sm hover:bg-gray-100 ${
                it.accent === "admin" ? "font-medium text-admin" : "text-ink"
              }`}
            >
              {it.label}
            </Link>
          ))}
          <div className="my-1 border-t border-[var(--line)]" />
          {loggedIn ? (
            <form action="/auth/signout" method="post">
              <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-gray-100 hover:text-ink">
                로그아웃
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-gray-100"
            >
              로그인
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
