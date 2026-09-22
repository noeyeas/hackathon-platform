import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { PRESENTATION_MAX } from "@/lib/types";

export const dynamic = "force-dynamic";

// 심사위원 안내서. 로그인 전에도 읽을 수 있게 공개해 둔다 — 심사위원이 행사 전에
// 링크만 받아 미리 훑어보게 하려는 것. 심사표는 DB(criteria)에서 읽어 채점
// 화면과 항상 같은 문구가 나오게 한다.
export default async function JudgeGuidePage() {
  const supabase = await createClient();
  const { data: criteria } = await supabase
    .from("criteria")
    .select("round, name, max_score, description")
    .order("sort");
  const mid = (criteria ?? []).filter((c) => c.round === "mid");
  const fin = (criteria ?? []).filter((c) => c.round === "final");
  const midSum = mid.reduce((s, c) => s + c.max_score, 0);
  const finSum = fin.reduce((s, c) => s + c.max_score, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Judge guide"
        title="심사위원 안내"
        desc="채점은 이 사이트에서 휴대폰·노트북으로 진행합니다. 5분이면 다 읽을 수 있습니다."
        aside={
          <Link href="/judge" className="btn-primary">
            채점 화면으로 →
          </Link>
        }
      />

      {/* 한눈에 */}
      <section className="card mt-6">
        <h2 className="font-bold">한눈에 보기</h2>
        <ol className="mt-3 flex flex-col gap-2 text-sm">
          <Step n={1}>
            <b>등록된 이메일</b>로 로그인합니다 (Google 로그인 권장).
          </Step>
          <Step n={2}>
            상단 <b>심사</b> 메뉴 → 날짜에 맞는 탭을 고릅니다:{" "}
            <b>중간발표 (9.28)</b> 또는 <b>본선 최종발표 (10.9)</b>.
          </Step>
          <Step n={3}>
            팀 카드를 눌러 펼치고, 항목마다 <b>슬라이더</b>로 점수를 정한 뒤{" "}
            <b>점수 저장</b>을 누릅니다.
          </Step>
          <Step n={4}>
            상단 진행률이 <b>모두 완료</b>가 될 때까지 반복합니다. 저장한 점수는
            언제든 다시 열어 고칠 수 있습니다.
          </Step>
        </ol>
      </section>

      {/* 로그인 */}
      <Section title="1. 로그인">
        <p>
          운영진에 알려 주신 이메일이 심사위원으로 미리 등록되어 있습니다. 그
          이메일로 로그인하면 <b>자동으로 심사위원 권한</b>이 부여됩니다.
        </p>
        <ul className="mt-2 list-disc pl-5">
          <li>
            <b>Google 로그인</b>을 권장합니다 — 즉시 됩니다.
          </li>
          <li>
            이메일 링크 로그인도 되지만 메일 도착까지 잠시 걸릴 수 있습니다.
          </li>
          <li>
            <b>다른 계정</b>(예: 학교 계정 ↔ Gmail)으로 로그인하면 일반 참가자로
            인식돼 채점 화면이 열리지 않습니다. 등록된 주소인지 확인해 주세요.
          </li>
        </ul>
      </Section>

      {/* 채점 화면 */}
      <Section title="2. 채점 화면 사용법">
        <ul className="list-disc pl-5">
          <li>
            <b>탭</b> — 중간발표와 본선은 심사표가 다르므로 화면 위에서 날짜에
            맞는 탭을 고릅니다. 잘못된 탭에서는 저장이 되지 않으니 걱정하지
            않으셔도 됩니다.
          </li>
          <li>
            <b>진행률</b> — 화면 위 막대가 “채점 완료 n / 전체 팀”을 보여 줍니다.
            남은 팀 수가 0이 되면 끝입니다.
          </li>
          <li>
            <b>팀 카드</b> — 팀 이름을 누르면 채점표가 펼쳐집니다. 오른쪽 배지가
            “미채점”이면 아직 저장 전, “✓ 채점됨”이면 저장된 상태입니다.
          </li>
          <li>
            <b>슬라이더</b> — 항목마다 0점부터 배점까지 1점 단위로 움직입니다.
            오른쪽 숫자가 “—”이면 아직 손대지 않은 것입니다. 0점을 주려면
            슬라이더를 한 번 눌러 주세요.
          </li>
          <li>
            <b>합계</b> — 카드 아래에 항목 합계가 자동으로 표시됩니다.
          </li>
          <li>
            <b>코멘트</b> (선택) — 팀에 남기고 싶은 말이 있으면 적어 주세요.
            운영진만 볼 수 있습니다.
          </li>
          <li>
            <b>점수 저장</b> — 모든 항목을 채워야 저장됩니다. 저장 후에도 카드를
            다시 열어 수정할 수 있습니다.
          </li>
          <li>
            저장이 안 되고 “평가가 닫혀 있습니다”가 보이면 운영진이 아직 채점을
            열지 않은 것입니다. 행사 진행에 맞춰 열립니다.
          </li>
        </ul>
      </Section>

      {/* 중간발표 */}
      <Section title="3. 중간발표 (9.28, 80주년기념관 310호)">
        <p>
          기획·아이디어 단계 발표입니다. 아래 {mid.length}개 항목({midSum}점)을
          심사위원이 채점하고, <b>발표 {PRESENTATION_MAX.mid}점은 운영진이 별도로
          반영</b>해 합계 100점이 됩니다. 합산 1위 팀이{" "}
          <b>매니패스트상</b>을 받습니다.
        </p>
        <CriteriaTable rows={mid} />
        <p className="mt-3 text-xs text-[var(--muted)]">
          중간발표 점수는 본선 점수에 합산되지 않습니다. 부담 없이 기획의 완성도로
          평가해 주세요.
        </p>
      </Section>

      {/* 본선 */}
      <Section title="4. 본선 최종발표 (10.9, 80주년기념관)">
        <p>
          무박 2일 개발을 마친 결과물 발표입니다(팀당 5분 + 질의응답). 아래{" "}
          {fin.length}개 항목({finSum}점)을 심사위원이 채점하고,{" "}
          <b>발표 {PRESENTATION_MAX.final}점·참여도 5점은 운영진이 반영</b>해
          합계 100점이 됩니다.
        </p>
        <CriteriaTable rows={fin} />
        <div className="mt-4 rounded-md bg-paper p-4">
          <p className="font-semibold">본선 점수는 이렇게 합쳐집니다</p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <b>1차 선정</b> — 심사위원 점수 : 참가 팀 상호평가 = 2 : 1 로
              합산해 상위 15팀을 전시 진출팀으로 뽑습니다.
            </li>
            <li>
              <b>최종 순위</b> — 진출팀은 여기에 전시 기간(10.11–10.13) 주민투표
              점수를 더합니다. 심사 50% · 상호평가 25% · 주민투표 25%.
            </li>
            <li>
              합산 1위 <b>노원구청장상</b>, 2~4위 <b>광운대학교 총장상</b>.
            </li>
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">
            심사위원 점수가 가장 큰 비중(50%)입니다. 여러 심사위원의 점수는 100점
            만점으로 환산한 뒤 평균됩니다.
          </p>
        </div>
      </Section>

      {/* 유의 */}
      <Section title="5. 유의 사항">
        <ul className="list-disc pl-5">
          <li>
            점수와 순위는 대회가 끝날 때까지 <b>비공개</b>입니다. 참가자는
            심사위원 개개인의 점수를 볼 수 없습니다.
          </li>
          <li>
            같은 항목이라도 팀 간 <b>상대 비교</b>를 염두에 두고 일관되게 매겨
            주시면 집계가 공정해집니다. 필요하면 나중에 되돌아가 수정하셔도
            됩니다.
          </li>
          <li>
            발표 시간 준수·출석 같은 <b>운영 요소는 운영진이 반영</b>하므로
            심사위원께서는 내용만 봐 주시면 됩니다.
          </li>
          <li>
            기권한 팀은 목록에 나오지 않습니다.
          </li>
          <li>
            화면이 이상하거나 저장이 안 되면 새로고침 후 다시 시도하고, 그래도
            안 되면 현장 운영진에게 말씀해 주세요.
          </li>
        </ul>
      </Section>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mt-4 text-sm leading-relaxed">
      <h2 className="mb-3 font-bold">{title}</h2>
      {children}
    </section>
  );
}

function CriteriaTable({
  rows,
}: {
  rows: { name: string; max_score: number; description: string | null }[];
}) {
  if (rows.length === 0)
    return <p className="mt-3 text-[var(--muted)]">심사표가 아직 등록되지 않았습니다.</p>;
  return (
    <ul className="mt-3 flex flex-col divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
      {rows.map((c) => (
        <li key={c.name} className="flex items-baseline gap-3 px-3 py-2.5">
          <span className="w-8 flex-none text-right text-base font-bold tabular-nums text-navy">
            {c.max_score}
          </span>
          <span className="min-w-0">
            <b>{c.name}</b>
            {c.description && (
              <span className="mt-0.5 block text-xs text-[var(--muted)]">{c.description}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
