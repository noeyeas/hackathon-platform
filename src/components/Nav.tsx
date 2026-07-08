import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NavMenu } from "./NavMenu";

const EVENT_ITEMS = [
  { href: "/notice", label: "공지" },
  { href: "/results", label: "결과" },
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
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = data?.role ?? null;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-5 px-5">
        <Link href="/" className="font-bold tracking-tight">
          🏆 해커톤
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {user && (
            <Link
              href="/mypage"
              className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
            >
              마이페이지
            </Link>
          )}
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
        <div className="ml-auto text-sm">
          {user ? (
            <form action="/auth/signout" method="post">
              <button className="text-[var(--muted)] hover:text-ink">
                로그아웃
              </button>
            </form>
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
