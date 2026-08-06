import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function StagePage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("event_settings")
    .select("name, presenting_project_id")
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, present_order, submitted_at, teams(name)")
    .order("present_order", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: true });

  const list =
    projects?.map((p) => ({
      id: p.id,
      title: p.title,
      team: (p.teams as unknown as { name: string } | null)?.name ?? "",
    })) ?? [];

  const currentId = settings?.presenting_project_id ?? null;
  const currentIdx = list.findIndex((p) => p.id === currentId);
  const current = currentIdx >= 0 ? list[currentIdx] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy-deep text-white">
      {/* 발표 화면 — 현재 발표 팀이 바뀌면 바로 따라가야 하므로 짧게 잡는다 */}
      <AutoRefresh intervalMs={4000} />

      {/* 상단 */}
      <div className="flex items-center justify-between px-10 py-6">
        <span className="font-mono text-sm uppercase tracking-widest text-white/50">
          {settings?.name ?? "해커톤"} · LIVE
        </span>
        <span className="flex items-center gap-2 text-sm text-white/50">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          발표 진행 중
        </span>
      </div>

      {/* 현재 발표 팀 */}
      <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
        {current ? (
          <>
            <p className="font-mono text-lg uppercase tracking-widest text-gold-bright">
              NOW PRESENTING
              {currentIdx >= 0 && (
                <span className="text-white/40">
                  {" "}
                  · {currentIdx + 1} / {list.length}
                </span>
              )}
            </p>
            <h1 className="mt-6 font-title text-6xl font-bold leading-tight tracking-tight sm:text-7xl">
              {current.team}
            </h1>
            <p className="mt-4 text-2xl text-white/70">{current.title}</p>
          </>
        ) : (
          <>
            <h1 className="text-5xl font-extrabold text-white/80">
              곧 발표가 시작됩니다
            </h1>
            <p className="mt-4 text-xl text-white/50">잠시만 기다려 주세요</p>
          </>
        )}
      </div>

      {/* 하단 순서 스트립 */}
      <div className="flex gap-2 overflow-x-auto px-10 py-6">
        {list.map((p, i) => {
          const active = p.id === currentId;
          const done = currentIdx >= 0 && i < currentIdx;
          return (
            <div
              key={p.id}
              className={`flex-none rounded-lg px-4 py-2 text-sm ${
                active
                  ? "bg-gold-bright font-bold text-navy-deep"
                  : done
                    ? "bg-white/5 text-white/30"
                    : "bg-white/10 text-white/70"
              }`}
            >
              <span className="font-mono text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>{" "}
              {p.team}
            </div>
          );
        })}
      </div>
    </div>
  );
}
