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
