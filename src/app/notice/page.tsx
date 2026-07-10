import { createClient } from "@/lib/supabase/server";
import NoticeList from "./NoticeList";

export const dynamic = "force-dynamic";

export default async function NoticePage() {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const items = list ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">공지사항</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            제목을 누르면 자세한 내용을 볼 수 있어요.
          </p>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 rounded-full bg-vote/10 px-3 py-1 text-sm font-semibold text-vote">
            전체 {items.length}
          </span>
        )}
      </div>

      <div className="mt-6">
        <NoticeList list={items} />
      </div>
    </div>
  );
}
