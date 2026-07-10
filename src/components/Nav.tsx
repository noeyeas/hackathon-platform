import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureLeaderMembership } from "@/lib/linkLeader";
import { getRemoteData } from "@/lib/remoteData";
import { MobileMenu } from "./MobileMenu";
import { NoticeNavLink } from "./NoticeNavLink";
import { NavLink } from "./NavLink";

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

  // 새 공지 표시용 최신 공지 시각 (60초 캐시)
  const { notices } = await getRemoteData();
  const latestNoticeAt = notices[0]?.created_at ?? null;

  // 모바일 햄버거 링크.
  const mobileItems: { href: string; label: string; accent?: "admin" }[] = [
    { href: "/notice", label: "공지" },
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
          <NoticeNavLink latestAt={latestNoticeAt} />
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
          <NavLink href="/results" label="결과" />
          {role === "admin" && (
            <NavLink href="/admin" label="운영" tone="admin" />
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {isLeader && (
            <NavLink
              href="/vote"
              label="평가"
              className="hidden sm:inline-flex"
            />
          )}
          {role === "judge" && (
            <NavLink
              href="/judge"
              label="심사"
              className="hidden sm:inline-flex"
            />
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
