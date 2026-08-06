import { createClient } from "@/lib/supabase/server";
import NoticeList from "./NoticeList";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader } from "@/components/PageHeader";
import { toNoticeCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NoticePage() {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, category, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const items = (list ?? []).map((a) => ({
    ...a,
    category: toNoticeCategory(a.category),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      {/* 현장에서 새 공지를 새로고침 없이 받아보도록 60초마다 갱신 */}
      <AutoRefresh intervalMs={60000} />

      <PageHeader
        eyebrow="Notice"
        title="공지사항"
        desc="운영 일정과 규정 변경은 모두 여기에 먼저 올라갑니다."
      />

      <div className="mt-8">
        <NoticeList list={items} />
      </div>
    </div>
  );
}
