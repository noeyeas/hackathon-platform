import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureLeaderMembership } from "@/lib/linkLeader";
import { getRemoteData } from "@/lib/remoteData";
import { MobileMenu } from "./MobileMenu";
import { NoticeNavLink } from "./NoticeNavLink";
import { NavLink } from "./NavLink";
import { BrandMark } from "./BrandMark";

const LINKS = [
  { href: "/recruit", label: "모집" },
  { href: "/gallery", label: "갤러리" },
];

export async function Nav() {
  const supabase = await createClient();

  // 세션 확인과 공지 조회(60초 캐시)는 서로 무관 — 병렬로 처리한다.
  const [
    {
      data: { user },
    },
    { notices },
  ] = await Promise.all([supabase.auth.getUser(), getRemoteData()]);

  let role: string | null = null;
  let isLeader = false;
  if (user) {
    // 역할과 팀 소속도 서로 무관하므로 한 번에 조회한다.
    const [{ data: me }, { data: m }] = await Promise.all([
      supabase.from("users").select("role").eq("id", user.id).single(),
      supabase
        .from("team_members")
        .select("is_leader")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    role = me?.role ?? null;
    isLeader = m?.is_leader ?? false;

    // 자동 연결은 '아직 팀이 없는 참가자'에게만 필요하다.
    // 이미 연결된 사용자(대부분)는 추가 조회 없이 넘어간다.
    if (!m && role === "participant") {
      await ensureLeaderMembership(user.id, user.email);
      const { data: linked } = await supabase
        .from("team_members")
        .select("is_leader")
        .eq("user_id", user.id)
        .maybeSingle();
      isLeader = linked?.is_leader ?? false;
    }
  }

  // 새 공지 표시용 최신 공지 시각
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
      <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-6 px-5">
        <Link
          href="/"
          className="flex flex-none items-center gap-2.5 font-title text-[0.95rem] font-bold tracking-tight text-ink"
        >
          <BrandMark />
          월계동 해커톤
        </Link>
        <nav className="hidden items-center gap-5 text-sm sm:flex">
          <NoticeNavLink latestAt={latestNoticeAt} />
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
          <NavLink href="/results" label="결과" />
          {role === "admin" && (
            <NavLink href="/admin" label="운영" tone="admin" />
          )}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {isLeader && (
            <NavLink
              href="/vote"
              label="평가"
              className="max-sm:hidden"
            />
          )}
          {role === "judge" && (
            <NavLink
              href="/judge"
              label="심사"
              className="max-sm:hidden"
            />
          )}
          {user ? (
            <>
              {isLeader && (
                <Link
                  href="/mypage"
                  className="text-[var(--muted)] transition hover:text-ink max-sm:hidden"
                >
                  마이페이지
                </Link>
              )}
              <form action="/auth/signout" method="post" className="max-sm:hidden">
                <button className="text-[var(--muted)] transition hover:text-ink">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="btn border border-navy bg-white !py-2 text-navy hover:bg-navy hover:text-white max-sm:hidden"
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
