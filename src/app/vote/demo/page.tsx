import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { byTeamNo, teamLabel } from "@/lib/format";
import { DemoBoard, type DemoProject } from "./DemoBoard";

// 팀 상호평가 연습 화면 (/vote/demo).
//
// 운영진·팀장이 본선 전에 평가 화면을 미리 써 볼 수 있게 한다. 로그인이
// 필요 없고, 실제 /vote 와 같은 카드(ScoreCard)·같은 심사 기준·같은 발표
// 순서를 쓰지만 저장은 각자 브라우저(localStorage)에만 한다. 서버 액션도
// DB 쓰기도 없어서 실제 평가·결과표·진행 현황에 아무 영향이 없고, 평가가
// 닫혀 있어도 연습할 수 있다.
//
// 여기서 읽는 것(팀 이름·조 번호·제출작 제목·심사 기준)은 갤러리와 홈에
// 이미 공개된 값뿐이다. 점수·순위는 읽지 않는다.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "팀 상호평가 연습",
  robots: { index: false, follow: false },
};

export default async function VoteDemoPage() {
  const admin = createAdminClient();
  const [{ data: criteria }, { data: projects }] = await Promise.all([
    admin
      .from("criteria")
      .select("id, name, max_score, weight, description")
      .eq("round", "final")
      .order("sort"),
    admin
      .from("projects")
      .select("id, title, present_order, teams(name, team_no, status)"),
  ]);

  type TeamInfo = { name: string; team_no: number | null; status: string };
  const list: DemoProject[] = (projects ?? [])
    .filter((p) => (p.teams as unknown as TeamInfo | null)?.status !== "withdrawn")
    // 실제 /vote 와 같은 순서 — 발표 순서, 없으면 뒤로 보내 조 번호순.
    .sort((a, b) => {
      const ao = (a.present_order as number | null) ?? Number.MAX_SAFE_INTEGER;
      const bo = (b.present_order as number | null) ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return byTeamNo(
        (a.teams as unknown as TeamInfo) ?? {},
        (b.teams as unknown as TeamInfo) ?? {}
      );
    })
    .map((p) => {
      const t = p.teams as unknown as TeamInfo | null;
      return {
        id: p.id as string,
        order: (p.present_order as number | null) ?? null,
        title: p.title as string,
        teamName: t ? teamLabel(t.team_no, t.name) : "",
      };
    });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Practice"
        title="팀별 채점 연습"
        desc="실제 평가 화면과 똑같이 써 볼 수 있는 연습용 화면입니다."
      />
      <DemoBoard
        projects={list}
        criteria={(criteria ?? []).map((c) => ({
          id: c.id as string,
          name: c.name as string,
          max_score: c.max_score as number,
          weight: c.weight as number,
          description: (c.description as string | null) ?? null,
        }))}
      />
    </div>
  );
}
