import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";

// TODO: 실제 구글 신청 폼 링크로 교체하세요
const APPLY_FORM_URL = "#";

const THEMES = [
  { icon: "♻️", t: "탄소 중립과 ESG", en: "Carbon Neutral", d: "탄소 배출 저감·자원 순환·친환경 생활을 유도하는 플랫폼으로 일상 속 ESG 실현" },
  { icon: "🏪", t: "시장 상권 활성화", en: "Local Commerce", d: "소상공인과 주민을 디지털로 연결해 골목상권·전통시장의 경쟁력 강화" },
  { icon: "📚", t: "교육 문제 해결·지원", en: "Education", d: "교육 격차 해소, 청소년·주민 맞춤 교육 인프라 및 멘토링 매칭" },
  { icon: "🚦", t: "교통 문제", en: "Mobility", d: "상습 정체·주차난·대중교통 접근성을 데이터와 기술로 개선" },
];

const GOALS = [
  { n: "01", t: "실효성 있는 지역 맞춤형 솔루션 개발", d: "탄소중립·상권·교육·교통 4개 분야에서 월계동에 실제로 쓰이는 디지털 솔루션을 만듭니다." },
  { n: "02", t: "지역사회 참여 및 소통의 장 마련", d: "대학생·개발자·기획자 등 청년 인재가 주민과 상생하는 소통 창구를 마련합니다." },
  { n: "03", t: "실제 서비스로의 발전 및 실행력 확보", d: "우수 결과물은 지역 서비스·지자체 정책 연계·오픈소스로 발전시켜 지속가능한 실행력을 갖춥니다." },
];

const SCHEDULE = [
  { date: "8.24 – 9.2", label: "참가 팀 모집" },
  { date: "9.7", label: "해커톤 시작" },
  { date: "9.11", label: "중간 보고서 및 멘토링" },
  { date: "9.18 – 9.19", label: "최종 발표 및 스프린트 (무박 2일)", place: "기념관 319호" },
];

const TILES = [
  { href: APPLY_FORM_URL, ext: true, icon: "📝", t: "참가 신청", en: "Apply", d: "모집 8.24 – 9.2 · 2~4인 팀", dark: true },
  { href: "/schedule", ext: false, icon: "🗓️", t: "일정 안내", en: "Schedule", d: "모집부터 최종 발표까지 전체 일정" },
  { href: "/notice", ext: false, icon: "📢", t: "공지사항", en: "Notice", d: "대회 관련 안내와 소식" },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("event_settings")
    .select("phase")
    .single();
  const phase = (settings?.phase ?? "signup") as EventPhase;

  const { data: notices } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="flex flex-col gap-24">
      {/* ===== HERO (풀 블리드) ===== */}
      <section className="bleed relative -mt-8 flex min-h-[560px] flex-col items-center justify-center overflow-hidden px-5 text-center sm:min-h-[640px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/campus.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/75" />

        <div className="relative flex flex-col items-center gap-5 text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-vote" />
            현재 단계 · {PHASE_LABEL[phase]}
          </span>
          <h1 className="text-5xl font-black leading-none tracking-tight sm:text-7xl">
            WOLGYE
            <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.9)" }}
            >
              HACKATHON
            </span>
          </h1>
          <p className="max-w-xl text-lg font-medium text-white/90 sm:text-xl">
            기술을 통해 월계동의 내일을 그리다
          </p>
          <p className="max-w-lg text-sm text-white/70">
            월계동 지역사회의 실제 현안을 청년의 시각에서 발굴하고,
            웹/앱 기술로 해결합니다.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <a href={APPLY_FORM_URL} target="_blank" rel="noreferrer" className="btn-primary">
              참가 신청하기
            </a>
            <Link
              href="/schedule"
              className="btn inline-flex border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
            >
              일정 보기
            </Link>
          </div>
        </div>

        <div className="scroll-cue absolute bottom-6 text-white/70">
          <span className="text-2xl">⌄</span>
        </div>
      </section>

      {/* ===== 주제 (Theme) ===== */}
      <Section eyebrow="Theme" title="해커톤 주제" desc="월계동 지역사회 문제 해결 및 발전을 위한 웹/애플리케이션 개발">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => (
            <div key={t.t} className="card flex flex-col gap-2">
              <span className="text-3xl">{t.icon}</span>
              <p className="font-mono text-xs uppercase tracking-wider text-vote">
                {t.en}
              </p>
              <h3 className="font-bold">{t.t}</h3>
              <p className="text-sm text-[var(--muted)]">{t.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== 피처 타일 ===== */}
      <section className="grid gap-4 sm:grid-cols-3">
        {TILES.map((tile) => {
          const inner = (
            <>
              <span className="text-3xl">{tile.icon}</span>
              <div className="mt-4">
                <h3 className="text-lg font-bold">{tile.t}</h3>
                <p
                  className={`font-mono text-xs uppercase tracking-wider ${
                    tile.dark ? "text-white/60" : "text-vote"
                  }`}
                >
                  {tile.en}
                </p>
              </div>
              <p
                className={`mt-2 text-sm ${
                  tile.dark ? "text-white/70" : "text-[var(--muted)]"
                }`}
              >
                {tile.d}
              </p>
              <span
                className={`mt-4 inline-block text-sm font-semibold ${
                  tile.dark ? "text-white" : "text-vote"
                }`}
              >
                바로가기 →
              </span>
            </>
          );
          const cls = `flex flex-col rounded-2xl p-6 shadow-sm transition hover:-translate-y-0.5 ${
            tile.dark
              ? "bg-ink text-white"
              : "border border-[var(--line)] bg-white"
          }`;
          return tile.ext ? (
            <a key={tile.t} href={tile.href} target="_blank" rel="noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={tile.t} href={tile.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </section>

      {/* ===== 목적 ===== */}
      <Section eyebrow="Purpose" title="해커톤의 목적">
        <div className="card">
          <p className="text-lg leading-relaxed">
            월계동 지역사회가 직면한 실제 현안을 주민과 청년의 시각에서 발굴하고,
            혁신적인 웹/애플리케이션 기술로 해결합니다. 단순한 아이디어에 그치지
            않고 <b className="text-ink">지역 맞춤형 디지털 솔루션</b>을 개발해 주민의
            삶의 질을 향상시키고, 지속 가능한 월계동 발전 모델을 구축합니다.
          </p>
        </div>
      </Section>

      {/* ===== 목표 ===== */}
      <Section eyebrow="Goals" title="해커톤의 목표">
        <div className="grid gap-4 lg:grid-cols-3">
          {GOALS.map((g) => (
            <div key={g.n} className="card">
              <div className="font-mono text-sm font-semibold text-vote">{g.n}</div>
              <h3 className="mt-2 font-bold">{g.t}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{g.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== 일정 & 장소 ===== */}
      <Section eyebrow="Schedule & Venue" title="일정 및 장소">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card !p-0">
            <ol className="flex flex-col">
              {SCHEDULE.map((s, i) => (
                <li
                  key={s.label}
                  className={`flex gap-4 px-5 py-4 ${
                    i !== SCHEDULE.length - 1 ? "border-b border-[var(--line)]" : ""
                  }`}
                >
                  <span className="w-28 flex-none font-mono text-sm font-bold text-vote">
                    {s.date}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.label}</p>
                    {s.place && (
                      <p className="mt-0.5 text-xs text-[var(--muted)]">📍 {s.place}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <div className="card">
              <p className="text-sm text-[var(--muted)]">최종 발표 장소</p>
              <p className="mt-1 text-lg font-bold">광운대학교 기념관 319호</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
              <iframe
                title="약도"
                src="https://www.google.com/maps?q=%EA%B4%91%EC%9A%B4%EB%8C%80%ED%95%99%EA%B5%90%20%EA%B8%B0%EB%85%90%EA%B4%80&z=16&output=embed"
                className="h-60 w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ===== 참가 안내 ===== */}
      <Section eyebrow="How to Join" title="참가 안내">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card">
            <h3 className="mb-3 font-bold">팀 구성</h3>
            <ul className="flex flex-col gap-1.5 text-sm text-[var(--muted)]">
              <li>· 팀당 <b className="text-ink">최소 2인 ~ 최대 4인</b></li>
              <li>· 총 <b className="text-ink">30팀</b> 선정</li>
              <li>· 개인 신청 불가</li>
              <li>· 전공 다양성·인원수(4명) 가산점</li>
              <li>· 초과 시 가산점 기준으로 선정</li>
            </ul>
          </div>
          <div className="card">
            <h3 className="mb-3 font-bold">참가비</h3>
            <p className="text-2xl font-bold">인당 10,000원</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              행사 종료 후 <b className="text-team">전액 환불</b>
            </p>
          </div>
          <div className="card">
            <h3 className="mb-3 font-bold">모집 기간</h3>
            <p className="text-2xl font-bold">8.24 – 9.2</p>
            <a href={APPLY_FORM_URL} target="_blank" rel="noreferrer" className="btn-primary mt-3 w-full">
              신청 폼 열기
            </a>
          </div>
        </div>
      </Section>

      {/* ===== 공지사항 ===== */}
      {notices && notices.length > 0 && (
        <Section eyebrow="Notice" title="공지사항">
          <div className="card !p-0">
            <ol className="flex flex-col">
              {notices.map((a, i) => (
                <li
                  key={a.id}
                  className={i !== notices.length - 1 ? "border-b border-[var(--line)]" : ""}
                >
                  <Link
                    href="/notice"
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a.title}</p>
                      {a.body && (
                        <p className="truncate text-sm text-[var(--muted)]">{a.body}</p>
                      )}
                    </div>
                    <span className="whitespace-nowrap font-mono text-xs text-[var(--muted)]">
                      {new Date(a.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    <span className="text-[var(--muted)]">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          <Link href="/notice" className="btn-ghost mt-4 self-start">
            더보기 +
          </Link>
        </Section>
      )}

      {/* ===== 문의 (풀 블리드 다크) ===== */}
      <section className="bleed relative overflow-hidden bg-ink px-5 py-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/campus.jpg')" }}
        />
        <div className="relative mx-auto grid max-w-5xl gap-10 sm:grid-cols-2">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-vote">
              Contact
            </p>
            <h2 className="mt-1 text-3xl font-bold">문의하기</h2>
            <p className="mt-3 text-white/70">
              궁금한 점은 아래 연락처로 문의 주시면 안내해 드립니다.
            </p>
            <div className="mt-6">
              <p className="text-sm text-white/60">담당자</p>
              <p className="mt-1 text-2xl font-bold">김세연</p>
              <a href="tel:01039425848" className="mt-1 inline-block text-lg text-white/90">
                📞 010-3942-5848
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-2xl bg-white/5 p-6 backdrop-blur">
            <div>
              <p className="text-sm text-white/60">참가 신청 기간</p>
              <p className="mt-1 text-2xl font-bold">8.24 – 9.2</p>
            </div>
            <a href={APPLY_FORM_URL} target="_blank" rel="noreferrer" className="btn-primary w-full">
              참가 신청하기
            </a>
          </div>
        </div>
      </section>

      {/* ===== 주관 · 후원 ===== */}
      <section className="flex flex-col gap-5">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-vote">
            Hosts &amp; Sponsors
          </p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">주관 · 후원</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card">
            <p className="text-sm font-semibold text-[var(--muted)]">주관</p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/council.jpg" alt="이음" className="h-12 w-12 flex-none rounded-xl object-cover" />
                <span className="font-semibold">광운대학교 총학생회 이음</span>
              </div>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hasung.jpg" alt="하성" className="h-12 w-12 flex-none rounded-xl object-cover" />
                <span className="font-semibold">인공지능융합대학 학생회 하성</span>
              </div>
            </div>
          </div>
          <div className="card">
            <p className="text-sm font-semibold text-[var(--muted)]">후원</p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/kakaopay.jpeg" alt="카카오페이" className="h-8 flex-none object-contain" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gray-100 text-[10px] font-bold text-[var(--muted)]">
                  월계동
                </div>
                <span className="font-semibold">월계동 주민단체</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-vote">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>
        {desc && <p className="mt-2 text-[var(--muted)]">{desc}</p>}
      </div>
      {children}
    </section>
  );
}
