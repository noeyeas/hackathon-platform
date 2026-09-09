import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

// 잘라서 나눠줄 투표권 인쇄 시트. 아직 쓰지 않은 투표권만 뽑는다 —
// 이미 사용된 장을 다시 인쇄하면 받은 주민이 "이미 사용한 투표권" 화면만 본다.
export default async function BallotPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  if (!(await requireAdmin())) return null;

  const batch = (await searchParams).batch ?? "";
  const admin = createAdminClient();
  const query = admin
    .from("audience_ballots")
    .select("code")
    .is("used_at", null)
    .order("created_at");
  const { data: ballots } = batch
    ? await query.eq("batch", batch)
    : await query.is("batch", null);

  // QR 에는 절대 URL 이 들어가야 한다 — 종이에서 찍는 것이라 상대 경로는 뜻이 없다.
  // 배포 도메인이 여러 개(프리뷰/운영)라 요청이 실제로 들어온 호스트를 쓴다.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const sheets = await Promise.all(
    (ballots ?? []).map(async (b) => ({
      code: b.code as string,
      qr: await QRCode.toDataURL(`${origin}/exhibit/${b.code}`, {
        margin: 1,
        width: 320,
        errorCorrectionLevel: "M",
      }),
    }))
  );

  return (
    <div>
      {/* 인쇄할 때는 운영 콘솔의 껍데기(내비·사이드바)를 지운다 */}
      <style>{`@media print { body > div > header, body > div > footer, nav { display: none !important; } .no-print { display: none !important; } }`}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl font-bold text-ink">
            투표권 인쇄 · {batch || "(라벨 없음)"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            미사용 {sheets.length}장. 잘라서 전시장에서 한 분께 한 장씩
            나눠주세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/audience" className="btn-ghost">
            ← 돌아가기
          </Link>
          <PrintButton />
        </div>
      </div>

      {sheets.length === 0 ? (
        <p className="no-print mt-6 text-sm text-[var(--muted)]">
          인쇄할 미사용 투표권이 없습니다.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
          {sheets.map((s) => (
            <div
              key={s.code}
              className="break-inside-avoid rounded-lg border border-dashed border-[var(--line-strong)] p-3 text-center"
            >
              <p className="font-title text-[11px] font-bold text-ink">
                광운대 해커톤 · 주민투표권
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.qr}
                alt={`투표권 ${s.code}`}
                className="mx-auto mt-2 aspect-square w-full max-w-[140px]"
              />
              <p className="mt-1 font-mono text-sm font-bold tracking-widest tabular-nums">
                {s.code}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-[var(--muted)]">
                QR 을 찍어 마음에 든 팀에 투표해 주세요.
                <br />한 장은 한 번만 쓸 수 있습니다.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
