import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "./AdminSidebar";

export const dynamic = "force-dynamic";

// 운영 콘솔 공통 셸. 권한 검사를 여기서 한 번만 하고, 통과하지 못하면
// 하위 페이지(서비스 롤로 조회하는 화면들)를 아예 렌더하지 않는다.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "admin") {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="font-title text-xl font-bold">운영진 전용 페이지입니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Supabase의 users 테이블에서 role을 admin으로 바꾸면 접근할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bleed px-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:gap-8">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
