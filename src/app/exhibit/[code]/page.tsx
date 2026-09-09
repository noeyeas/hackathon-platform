import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizeBallotCode } from "@/lib/ballot";
import { PROJECT_TRACK_LABEL, toProjectTrack, type Ranking } from "@/lib/types";
import { BallotForm, type Candidate } from "./BallotForm";
import { castAudienceVotes } from "./actions";

export const dynamic = "force-dynamic";

// 전시장 QR 투표 화면. 로그인 없이 투표권 코드 하나로 들어온다.
export default async function ExhibitVotePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = normalizeBallotCode((await params).code);
  if (!code)
    return (
      <Notice
        title="유효하지 않은 투표권입니다"
        body="전시장에서 받은 투표권의 QR 을 다시 찍어 주세요."
      />
    );

  const admin = createAdminClient();
  const [{ data: settings }, { data: ballot }] = await Promise.all([
    admin
      .from("event_settings")
      .select("audience_voting_open, votes_per_ballot")
      .eq("id", 1)
      .single(),
    admin
      .from("audience_ballots")
      .select("code, used_at")
      .eq("code", code)
      .maybeSingle(),
  ]);

  if (!ballot)
    return (
      <Notice
        title="유효하지 않은 투표권입니다"
        body="전시장 안내데스크에서 투표권을 받아 주세요."
      />
    );

  if (!settings?.audience_voting_open)
    return (
      <Notice
        title="아직 주민투표가 열리지 않았습니다"
        body="전시 기간에 맞춰 투표가 열립니다. 잠시 뒤 다시 찍어 주세요."
      />
    );

  if (ballot.used_at)
    return (
      <Notice
        title="투표해 주셔서 고맙습니다 🎉"
        body="이 투표권은 이미 사용되었습니다. 결과는 전시가 끝난 뒤 공개됩니다."
        gallery
      />
    );

  // 전시 진출팀만 후보. rankings 는 서비스 롤 전용이라(0022) 여기서 읽고
  // 점수·순위는 화면으로 내보내지 않는다 — 투표 중에 순위가 새면 안 된다.
  const { data: rankings } = await admin
    .from("rankings")
    .select("project_id, is_finalist")
    .returns<Pick<Ranking, "project_id" | "is_finalist">[]>();
  const finalistIds = (rankings ?? [])
    .filter((r) => r.is_finalist)
    .map((r) => r.project_id);

  if (finalistIds.length === 0)
    return (
      <Notice
        title="아직 전시 진출팀이 정해지지 않았습니다"
        body="최종발표 심사가 끝나면 투표를 시작할 수 있습니다."
      />
    );

  const { data: projects } = await admin
    .from("projects")
    .select("id, title, description, track, thumbnail_url, teams(name)")
    .in("id", finalistIds);

  // 후보 순서는 투표권마다 다르게 섞는다. 늘 같은 팀이 맨 위에 오면 그 자체로
  // 표가 쏠리기 때문이다. 코드를 시드로 쓰므로 한 사람에게는 순서가 고정된다.
  const candidates: Candidate[] = (projects ?? [])
    .map((p) => ({
      id: p.id as string,
      title: p.title as string,
      team: (p.teams as unknown as { name: string } | null)?.name ?? "",
      description: (p.description as string | null) ?? "",
      thumbnail: (p.thumbnail_url as string | null) ?? null,
      track: PROJECT_TRACK_LABEL[toProjectTrack(p.track) ?? "etc"],
    }))
    .sort((a, b) => hash(code + a.id) - hash(code + b.id));

  return (
    <BallotForm
      code={code}
      maxPicks={settings.votes_per_ballot ?? 3}
      candidates={candidates}
      action={castAudienceVotes}
    />
  );
}

// 문자열 → 정수. 순서를 섞기만 하면 되므로 분포만 고르면 충분하다.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Notice({
  title,
  body,
  gallery,
}: {
  title: string;
  body: string;
  gallery?: boolean;
}) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="display text-xl">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
      {gallery && (
        <Link href="/gallery" className="btn-primary mt-4 inline-flex">
          출품작 둘러보기
        </Link>
      )}
    </div>
  );
}
