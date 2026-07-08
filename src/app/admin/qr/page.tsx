import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { generateTableTokens } from "../actions";
import { QRSheet } from "./QRSheet";

export const dynamic = "force-dynamic";

export default async function QRPage() {
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

  const { data: tokens } = await supabase
    .from("audience_tokens")
    .select("id, token, label, votes_total, votes_used")
    .order("created_at");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">관객 투표 QR 관리</h1>
        <p className="mt-1 text-[var(--muted)]">
          테이블마다 다른 QR을 생성합니다. 각 QR은 지정한 표 수만큼 투표할 수
          있습니다.
        </p>

        <div className="card mt-5 max-w-md">
          <ActionForm
            action={generateTableTokens}
            submitLabel="QR 생성"
            successMessage="생성되었습니다. 아래 목록을 새로고침하세요."
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">테이블 수</label>
                <input name="count" type="number" min={1} max={200} defaultValue={30} className="input" />
              </div>
              <div>
                <label className="label">테이블당 표 수</label>
                <input name="votes" type="number" min={1} defaultValue={3} className="input" />
              </div>
            </div>
          </ActionForm>
        </div>
      </div>

      <QRSheet
        tokens={tokens ?? []}
        siteUrl={siteUrl}
      />
    </div>
  );
}
