import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";

// 공용 데이터: 공지·일정·마일스톤 (상단 내비 '공지' 배지 등에서 사용).
// 매 페이지 전환마다 조회되므로 60초간 캐싱한다.
// 운영진이 내용을 바꾸면 revalidateTag("remote-data")로 즉시 갱신.
export const getRemoteData = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const [{ data: notices }, { data: schedule }, { data: milestones }] =
      await Promise.all([
        supabase
          .from("announcements")
          .select("id, title, body, pinned, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("schedule_items")
          .select("id, time_label, starts_at, title")
          .order("starts_at", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("milestones")
          .select("id, label, target_at")
          .order("target_at", { ascending: true }),
      ]);

    return {
      notices: notices ?? [],
      schedule: schedule ?? [],
      milestones: milestones ?? [],
    };
  },
  ["remote-data"],
  { tags: ["remote-data"], revalidate: 60 }
);
