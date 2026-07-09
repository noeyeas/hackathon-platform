import { createClient } from "@/lib/supabase/server";

// 현재 요청 사용자가 운영진(admin)인지 서버에서 검증한다.
// 서버 액션은 RLS 뿐 아니라 이 검사로도 권한을 강제해야 한다.
export async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}
