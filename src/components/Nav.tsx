import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureLeaderMembership } from "@/lib/linkLeader";
import { MobileMenu } from "./MobileMenu";

// 공지/일정/D-day 는 우측 부유 리모컨(RemoteControl)에 있으므로 상단바에서는 생략.
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

  // 모바일 햄버거 링크. 공지/일정/D-day 는 하단 탭바(RemoteControl)에 있으므로 제외.
  const mobileItems: { href: string; label: string; accent?: "admin" }[] = [
    ...LINKS,
    { href: "/results", label: "결과" },
    ...(isLeader ? [{ href: "/vote", label: "평가" }] : []),
    ...(role === "judge" ? [{ href: "/judge", label: "심사" }] : []),
    ...(isLeader ? [{ href: "/mypage", label: "마이페이지" }] : []),
    ...(role === "admin"
      ? [{ href: "/admin", label: "운영", accent: "admin" as const }]
      : []),
  ];

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
          <Link
            href="/results"
            className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
          >
            결과
          </Link>
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
          {isLeader && (
            <Link
              href="/vote"
              className="hidden rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink sm:inline-flex"
            >
              평가
            </Link>
          )}
          {role === "judge" && (
            <Link
              href="/judge"
              className="hidden rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink sm:inline-flex"
            >
              심사
            </Link>
          )}
          {user ? (
            <>
              {isLeader && (
                <Link
                  href="/mypage"
                  className="text-[var(--muted)] hover:text-ink max-sm:hidden"
                >
                  마이페이지
                </Link>
              )}
              <form action="/auth/signout" method="post" className="max-sm:hidden">
                <button className="text-[var(--muted)] hover:text-ink">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="btn-primary !rounded-full max-sm:hidden"
            >
              로그인
            </Link>
          )}
          <MobileMenu items={mobileItems} loggedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
