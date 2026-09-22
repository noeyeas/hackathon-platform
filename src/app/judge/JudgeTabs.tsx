import Link from "next/link";

// 심사 화면 상단 탭 — 중간발표(9.28)와 본선(10.9)은 심사표·저장소가 다르다(0053).
// 심사위원이 지금 어느 날의 채점표를 보고 있는지 한눈에 알아야 한다.
const TABS = [
  { key: "mid", href: "/judge/mid", label: "중간발표 (9.28)" },
  { key: "final", href: "/judge", label: "본선 최종발표 (10.9)" },
] as const;

export function JudgeTabs({ active }: { active: "mid" | "final" }) {
  return (
    <div className="mt-4">
    <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-paper p-1">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex-1 rounded-md px-3 py-2 text-center text-sm transition ${
              on
                ? "bg-white font-semibold text-ink shadow-sm"
                : "text-[var(--muted)] hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
    <p className="mt-2 text-right text-xs">
      <Link href="/judge/guide" className="text-navy underline">
        심사위원 안내 보기
      </Link>
    </p>
    </div>
  );
}
