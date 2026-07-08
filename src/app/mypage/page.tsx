import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">로그인이 필요합니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          마이페이지는 로그인 후 이용할 수 있습니다.
        </p>
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          로그인 / 가입
        </Link>
      </div>
    );
  }

  const { data: me } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, teams(name, status)")
    .eq("user_id", user.id)
    .maybeSingle();
  const team = membership?.teams as unknown as {
    name: string;
    status: string;
  } | null;

  let project: { title: string } | null = null;
  if (membership) {
    const { data } = await supabase
      .from("projects")
      .select("title")
      .eq("team_id", membership.team_id)
      .maybeSingle();
    project = data;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">마이페이지</h1>
      <p className="mt-1 text-[var(--muted)]">
        {me?.name ?? me?.email}님, 환영합니다.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/team"
          className="card transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-2xl">👥</div>
          <h2 className="mt-2 font-bold">내 팀</h2>
          {team ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {team.name} · {team.status === "locked" ? "확정됨" : "모집 중"}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">
              아직 팀이 없습니다. 팀을 만들거나 합류하세요.
            </p>
          )}
          <span className="mt-3 inline-block text-sm font-medium text-vote">
            팀 관리 →
          </span>
        </Link>

        <Link
          href="/submit"
          className="card transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-2xl">📦</div>
          <h2 className="mt-2 font-bold">프로젝트 제출</h2>
          {project ? (
            <p className="mt-1 line-clamp-1 text-sm text-[var(--muted)]">
              제출됨 · {project.title}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">
              아직 제출 전입니다.
            </p>
          )}
          <span className="mt-3 inline-block text-sm font-medium text-vote">
            {project ? "제출물 수정 →" : "제출하기 →"}
          </span>
        </Link>
      </div>
    </div>
  );
}
