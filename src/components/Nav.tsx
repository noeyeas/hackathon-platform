import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureLeaderMembership } from "@/lib/linkLeader";
import { NavMenu } from "./NavMenu";

const EVENT_ITEMS = [
  { href: "/notice", label: "공지" },
  { href: "/schedule", label: "일정" },
  { href: "/dday", label: "D-day" },
];

const LINKS = [
  { href: "/recruit", label: "모집" },
  { href: "/gallery", label: "갤러리" },
];

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let isLeader = false;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = data?.role ?? null;

    if (role === "participant") {
      // 팀장 이메일로 등록된 팀에 자동 연결한 뒤 팀장 여부 확인
      await ensureLeaderMembership(user.id, user.email);
      const { data: m } = await supabase
        .from("team_members")
        .select("is_leader")
        .eq("user_id", user.id)
        .maybeSingle();
      isLeader = m?.is_leader ?? false;
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-5 px-5">
        <Link href="/" className="font-bold tracking-tight">
          🏆 해커톤
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <NavMenu label="대회" items={EVENT_ITEMS} />
          <Link
            href="/results"
            className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
          >
            결과
          </Link>
          {isLeader && (
            <Link
              href="/vote"
              className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
            >
              평가
            </Link>
          )}
          {role === "judge" && (
            <Link
              href="/judge"
              className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
            >
              심사
            </Link>
          )}
          {role === "admin" && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 font-medium text-admin hover:bg-gray-100"
            >
              운영
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              {isLeader && (
                <Link
                  href="/mypage"
                  className="text-[var(--muted)] hover:text-ink"
                >
                  마이페이지
                </Link>
              )}
              <form action="/auth/signout" method="post">
                <button className="text-[var(--muted)] hover:text-ink">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
