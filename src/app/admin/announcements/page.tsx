import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { createAnnouncement } from "./actions";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
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
  if (me?.role !== "admin") redirect("/");

  const { data: list } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">공지사항 관리</h1>
      <p className="mt-1 text-[var(--muted)]">
        올린 공지는 참가자 <b>/notice</b> 화면에 바로 표시됩니다.
      </p>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        {/* 왼쪽: 기존 공지 목록 */}
        <div className="flex flex-col gap-3">
          {list?.map((a) => (
            <div key={a.id} className="card flex items-start justify-between gap-2 !p-4">
              {a.body ? (
                <details className="group min-w-0 flex-1">
                  <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                    {a.pinned && <span className="chip border-vote text-vote">고정</span>}
                    <h3 className="font-semibold">{a.title}</h3>
                    <span className="ml-auto flex-none text-[var(--muted)] transition group-open:rotate-180">
                      ⌄
                    </span>
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
                    {a.body}
                  </p>
                </details>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {a.pinned && <span className="chip border-vote text-vote">고정</span>}
                  <h3 className="font-semibold">{a.title}</h3>
                </div>
              )}
              <DeleteButton id={a.id} />
            </div>
          ))}
          {!list?.length && (
            <p className="card text-center text-[var(--muted)]">
              아직 공지가 없습니다.
            </p>
          )}
        </div>

        {/* 오른쪽: 새 공지 작성 */}
        <div className="card lg:sticky lg:top-20">
          <h2 className="mb-3 font-bold">새 공지 작성</h2>
          <ActionForm
            action={createAnnouncement}
            submitLabel="공지 올리기"
            successMessage="공지를 올렸습니다. 목록을 새로고침하세요."
          >
            <label className="label">제목 *</label>
            <input name="title" required className="input" placeholder="예: 점심 식사 안내" />
            <label className="label mt-3">내용</label>
            <textarea name="body" rows={3} className="input" placeholder="상세 내용 (선택)" />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" name="pinned" className="h-4 w-4" />
              상단 고정
            </label>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
