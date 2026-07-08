import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";
import { InfoModals } from "@/components/InfoModals";

export default async function Home() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("event_settings")
    .select("name, phase")
    .single();

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, label, target_at")
    .order("target_at", { ascending: true });

  const { data: notices } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: schedule } = await supabase
    .from("schedule_items")
    .select("id, time_label, starts_at, title")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const phase = (settings?.phase ?? "signup") as EventPhase;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-5 py-4 sm:py-8">
        <span className="chip">
          <span className="h-2 w-2 rounded-full bg-vote" />
          현재 단계 · {PHASE_LABEL[phase]}
        </span>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {settings?.name ?? "해커톤"}에
          <br />
          오신 걸 환영합니다 🚀
        </h1>
        <p className="max-w-xl text-[var(--muted)]">
          2~4인 팀으로 참가하고, 프로젝트를 제출하고, 심사위원·다른 팀·현장
          관객의 투표로 최종 순위가 결정됩니다.
        </p>
        <div className="flex gap-3">
          <Link href="/team" className="btn-primary">
            참가하기
          </Link>
          <Link href="/gallery" className="btn-ghost">
            제출작 둘러보기
          </Link>
        </div>

        {/* 공지·일정·D-day 팝업 트리거 */}
        <InfoModals
          milestones={milestones ?? []}
          notices={notices ?? []}
          schedule={schedule ?? []}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { n: "01", t: "팀 구성", d: "팀을 만들거나 초대 코드로 합류 (2~4명)" },
          { n: "02", t: "프로젝트 제출", d: "깃허브·데모·영상·발표자료 등록" },
          { n: "03", t: "투표", d: "팀 상호 투표 + QR 관객 투표" },
          { n: "04", t: "결과 발표", d: "가중 합산으로 최종 순위 공개" },
        ].map((s) => (
          <div key={s.n} className="card">
            <div className="font-mono text-sm font-semibold text-vote">
              {s.n}
            </div>
            <h3 className="mt-2 font-bold">{s.t}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{s.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
