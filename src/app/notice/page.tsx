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

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">공지사항</h1>
      <p className="mt-1 text-[var(--muted)]">
        제목을 누르면 내용을 볼 수 있습니다.
      </p>

      <div className="mt-6">
        <NoticeList list={list ?? []} />
      </div>
    </div>
  );
}
