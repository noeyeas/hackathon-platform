"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const ITEMS = [
  { href: "/team", label: "내 팀" },
  { href: "/recruit", label: "모집" },
  { href: "/submit", label: "제출" },
];

export function ParticipantMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
      >
        참여자
        <span
          className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-[var(--line)] bg-white p-1 shadow-lg">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-gray-100"
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
