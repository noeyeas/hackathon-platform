import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { createAnnouncement } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { AdminPageHeader } from "../AdminPageHeader";
import { NOTICE_CATEGORIES, NOTICE_CATEGORY_LABEL, toNoticeCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, category, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="공지 발행"
        desc={
          <>
            올린 공지는 참가자 <b>/notice</b> 화면에 바로 표시됩니다. 분류를
            지정하면 참가자가 목록에서 걸러 볼 수 있습니다.
          </>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
        {/* 왼쪽: 기존 공지 목록 */}
        <div className="panel divide-y divide-[var(--line)]">
          {list?.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3.5">
              <details className="group min-w-0 flex-1">
                <summary
                  className={`flex list-none items-center gap-2 [&::-webkit-details-marker]:hidden ${
                    a.body ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {a.pinned && <span className="badge-navy flex-none">고정</span>}
                  <span className="flex-none text-xs font-semibold text-gold-ink">
                    {NOTICE_CATEGORY_LABEL[toNoticeCategory(a.category)]}
                  </span>
                  <h3 className="truncate font-semibold">{a.title}</h3>
                  <span className="ml-auto flex-none text-xs text-[var(--muted)]">
                    {new Date(a.created_at).toLocaleDateString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </span>
                </summary>
                {a.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
                    {a.body}
                  </p>
                )}
              </details>
              <DeleteButton id={a.id} />
            </div>
          ))}
          {!list?.length && (
            <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
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
            successMessage="공지를 올렸습니다."
            resetOnSuccess
          >
            <label className="label" htmlFor="notice-title">
              제목 *
            </label>
            <input
              id="notice-title"
              name="title"
              required
              className="input"
              placeholder="예: 점심 식사 안내"
            />

            <label className="label mt-3" htmlFor="notice-category">
              분류
            </label>
            <select
              id="notice-category"
              name="category"
              defaultValue="general"
              className="input"
            >
              {NOTICE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <label className="label mt-3" htmlFor="notice-body">
              내용
            </label>
            <textarea
              id="notice-body"
              name="body"
              rows={4}
              className="input"
              placeholder="상세 내용 (선택)"
            />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" name="pinned" className="h-4 w-4 accent-navy" />
              상단 고정
            </label>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
