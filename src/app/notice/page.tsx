import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NoticePage() {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">공지사항</h1>
      <p className="mt-1 text-[var(--muted)]">대회 관련 안내를 확인하세요.</p>

      <div className="mt-6 flex flex-col gap-3">
        {list?.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-center gap-2">
              {a.pinned && (
                <span className="chip border-vote text-vote">고정</span>
              )}
              <h3 className="font-bold">{a.title}</h3>
            </div>
            {a.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
                {a.body}
              </p>
            )}
            <p className="mt-3 font-mono text-xs text-[var(--muted)]">
              {new Date(a.created_at).toLocaleString("ko-KR")}
            </p>
          </div>
        ))}
        {!list?.length && (
          <p className="card text-center text-[var(--muted)]">
            아직 공지가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
