import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";

// 공용 데이터: 최신 공지 (상단 내비 '공지' 안읽음 배지에서 사용).
// 매 페이지 전환마다 조회되므로 60초간 캐싱한다.
// 운영진이 공지를 바꾸면 revalidateTag("remote-data")로 즉시 갱신.
export const getRemoteData = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data: notices } = await supabase
      .from("announcements")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    return { notices: notices ?? [] };
  },
  ["remote-data"],
  { tags: ["remote-data"], revalidate: 60 }
);

// 홈 히어로 타임라인 노드 = 마일스톤(라벨·날짜·장소), 날짜 오름차순.
// 운영진이 마일스톤을 수정하면 revalidateTag("remote-data")로 갱신된다.
export const getTimeline = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("milestones")
      .select("label, target_at, place")
      .order("target_at", { ascending: true });
    return (data ?? []) as {
      label: string;
      target_at: string;
      place: string | null;
    }[];
  },
  ["timeline"],
  { tags: ["remote-data"], revalidate: 60 }
);
