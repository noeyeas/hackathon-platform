import Link from "next/link";
import Image from "next/image";
import { LogoMarquee } from "@/components/LogoMarquee";
import { HeroTimeline } from "@/components/HeroTimeline";
import { Reveal } from "@/components/Reveal";
import { RevealGroup } from "@/components/RevealGroup";
import { getTimeline } from "@/lib/remoteData";
import { formatMonthDay } from "@/lib/format";

// TODO: 실제 구글 신청 폼 링크로 교체하세요
const APPLY_FORM_URL = "#";

const THEMES = [
  { icon: "♻️", t: "탄소 중립과 ESG", en: "Carbon Neutral", d: "탄소 배출 저감·자원 순환·친환경 생활을 유도하는 플랫폼으로 일상 속 ESG 실현", tint: "#edf9f1", ring: "#cfeed7", chip: "#d7f1e0", accent: "#2f9e5f" },
  { icon: "🏪", t: "시장 상권 활성화", en: "Local Commerce", d: "소상공인과 주민을 디지털로 연결해 골목상권·전통시장의 경쟁력 강화", tint: "#fdf5e9", ring: "#f4e3c4", chip: "#f9e8cd", accent: "#c58a1c" },
  { icon: "📚", t: "교육 문제 해결·지원", en: "Education", d: "교육 격차 해소, 청소년·주민 맞춤 교육 인프라 및 멘토링 매칭", tint: "#eef3fd", ring: "#d5e2f7", chip: "#dce8fb", accent: "#3b78d4" },
  { icon: "🚦", t: "교통 문제", en: "Mobility", d: "상습 정체·주차난·대중교통 접근성을 데이터와 기술로 개선", tint: "#fdeef2", ring: "#f6d7e0", chip: "#f9dce4", accent: "#d05579" },
];

const INSTAGRAM = [
  { label: "인공지능융합대학 하성", handle: "@kw_aiconv", href: "https://www.instagram.com/kw_aiconv/" },
  { label: "총학생회 이음", handle: "@kwu_studentcouncil", href: "https://www.instagram.com/kwu_studentcouncil/" },
];

// 오픈채팅 문의 전에 스스로 해결하도록 — 답변은 모두 사이트 내 확정 정보 기반(지어낸 답 없음).
// 운영진은 문구만 수정하면 되고, 새 질문 추가 시 아래 배열에 한 줄 넣으면 됩니다.
const FAQ = [
  {
    q: "신청은 어떻게 하나요?",
    a: "위의 ‘참가 신청하기’ 버튼에서 구글 신청 폼을 작성하면 됩니다. 신청은 팀장이 팀을 대표해서 진행하고, 폼에 적은 팀장 이메일로 로그인하면 이 사이트의 팀 페이지가 자동으로 연결됩니다.",
  },
  {
    q: "팀은 몇 명으로 구성해야 하나요?",
    a: "팀당 최소 2인 ~ 최대 4인입니다. 개인 신청은 받지 않으며, 전공 다양성과 4인 구성에는 가산점이 있습니다.",
  },
  {
    q: "참가비가 있나요? 돌려받을 수 있나요?",
    a: "인당 10,000원입니다. 행사에 끝까지 참여하면 종료 후 전액 환불해 드립니다.",
  },
  {
    q: "몇 팀을 뽑고, 선정 기준은 무엇인가요?",
    a: "총 30팀을 선정합니다. 신청이 초과되면 전공 다양성과 인원수(4명) 가산점을 기준으로 선정합니다.",
  },
  {
    q: "어떤 주제로 개발하나요?",
    a: "월계동 지역사회 문제를 해결하는 웹/애플리케이션을 만듭니다. 탄소 중립·ESG, 시장 상권 활성화, 교육 문제 해결, 교통 문제 개선 — 4개 분야 중에서 정하면 됩니다.",
  },
  {
    q: "무엇을 제출해야 하나요?",
    a: "팀당 프로젝트 1개를 제출합니다. 프로젝트 제목과 GitHub 저장소는 필수이고, 데모 링크·데모 영상·참고자료(PDF)는 선택입니다. 마감 전까지는 언제든 수정할 수 있습니다.",
  },
  {
    q: "순위는 어떻게 정해지나요?",
    a: "심사위원 평가 50%, 참가 팀 간 상호 평가 25%, 주민 투표 25%를 합산해 종합 순위를 정합니다. 공정성을 위해 실시간 순위·점수는 대회가 끝난 뒤에 공개됩니다.",
  },
  {
    q: "전체 일정과 장소가 어떻게 되나요?",
    a: "모집 8.24–9.2 → 9.7 해커톤 시작 → 9.11 중간 보고·멘토링 → 9.18–9.19 최종 발표 및 스프린트(무박 2일) 순으로 진행합니다. 최종 발표는 광운대학교 기념관 319호에서 열립니다.",
  },
];

const KAKAO_OPENCHAT = "https://open.kakao.com/o/sJcelIai";

// 어두운 배경에 어울리는 미니멀 아웃라인 소셜 버튼
const socialBtn =
  "flex w-full items-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/10";

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 flex-none" aria-hidden>
      <path d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.66 1.78 5 4.47 6.33-.2.71-.72 2.6-.82 3-.13.51.19.5.39.37.16-.1 2.53-1.72 3.56-2.42.46.06.94.09 1.4.09 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 flex-none"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export default async function Home() {
  const timeline = await getTimeline();
  const timelineNodes = timeline.map((m) => ({
    date: formatMonthDay(m.target_at),
    label: m.label,
    at: m.target_at,
    place: m.place,
  }));

  return (
    <div className="flex flex-col gap-24">
      {/* ===== 히어로 + 하단 마퀴 ===== */}
      <div>
        <section className="bleed relative -mt-8 flex min-h-[560px] flex-col items-center justify-center overflow-hidden px-5 text-center sm:min-h-[640px]">
          <Image
            src="/campus.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/70" />

          <div className="hero-in relative flex flex-col items-center gap-5 text-white">
            <h1 className="font-display text-5xl leading-none tracking-tight sm:text-8xl">
              2026
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
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <a href={APPLY_FORM_URL} target="_blank" rel="noreferrer" className="btn-primary !rounded-full">
                참가 신청하기
              </a>
              <Link
                href="/gallery"
                className="btn inline-flex !rounded-full border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                제출작 보기
              </Link>
            </div>
          </div>

          <HeroTimeline nodes={timelineNodes} />
        </section>

        <LogoMarquee />
      </div>

      {/* ===== 주제 (Theme) ===== */}
      <Section eyebrow="Theme" title="해커톤 주제" desc="월계동 지역사회 문제 해결 및 발전을 위한 웹/애플리케이션 개발">
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => (
            <div
              key={t.t}
              className="card flex h-full flex-col gap-2 transition hover:-translate-y-1 hover:shadow-md"
              style={{ backgroundColor: t.tint, borderColor: t.ring }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: t.chip }}
              >
                {t.icon}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.accent }}>
                {t.en}
              </p>
              <h3 className="font-bold">{t.t}</h3>
              <p className="text-sm text-[var(--muted)]">{t.d}</p>
            </div>
          ))}
        </RevealGroup>
      </Section>

      {/* ===== 참가 안내 ===== */}
      <Section eyebrow="How to Join" title="참가 안내">
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card h-full">
            <h3 className="mb-3 font-bold">팀 구성</h3>
            <ul className="flex flex-col gap-1.5 text-sm text-[var(--muted)]">
              <li>· 팀당 <b className="text-ink">최소 2인 ~ 최대 4인</b></li>
              <li>· 총 <b className="text-ink">30팀</b> 선정</li>
              <li>· 개인 신청 불가</li>
              <li>· 전공 다양성·인원수(4명) 가산점</li>
              <li>· 초과 시 가산점 기준으로 선정</li>
            </ul>
          </div>
          <div className="card h-full">
            <h3 className="mb-3 font-bold">참가비</h3>
            <p className="text-2xl font-bold">인당 10,000원</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              행사 종료 후 <b className="text-team">전액 환불</b>
            </p>
          </div>
          <div className="card h-full">
            <h3 className="mb-3 font-bold">모집 기간</h3>
            <p className="text-2xl font-bold">8.24 – 9.2</p>
            <a href={APPLY_FORM_URL} target="_blank" rel="noreferrer" className="btn-primary mt-3 w-full">
              신청 폼 열기
            </a>
          </div>
        </RevealGroup>
      </Section>

      {/* ===== FAQ + 문의 (풀 블리드 다크) ===== */}
      <Reveal>
      <section className="bleed relative overflow-hidden bg-ink px-5 py-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/campus.jpg')" }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-14">
          {/* FAQ */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-vote">
              FAQ
            </p>
            <h2 className="mt-1 text-3xl font-bold">자주 묻는 질문</h2>
            <p className="mt-2 text-sm text-white/60">
              문의 전에 여기서 먼저 확인해 보세요.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-white/15 bg-white/5 transition hover:border-white/25"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold">
                    <span>{f.q}</span>
                    <span
                      className="flex-none text-white/50 transition-transform group-open:rotate-180"
                      aria-hidden
                    >
                      ⌄
                    </span>
                  </summary>
                  <p className="border-t border-white/10 p-4 text-sm leading-relaxed text-white/70">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* 문의 */}
          <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-vote">
              Contact
            </p>
            <h2 className="mt-1 text-3xl font-bold">문의하기</h2>
            <div className="mt-6">
              <p className="text-sm text-white/60">담당자</p>
              <p className="mt-1 text-2xl font-bold">김세연</p>
              <a href="tel:01039425848" className="mt-1 inline-block text-lg text-white/90">
                📞 010-3942-5848
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-2xl bg-white/5 p-6 backdrop-blur">
            <p className="text-sm text-white/70">
              궁금한 점은 카카오톡으로 편하게 문의하세요.
            </p>
            <a
              href={KAKAO_OPENCHAT}
              target="_blank"
              rel="noreferrer"
              className={socialBtn}
            >
              <KakaoIcon />
              하성 1:1 오픈채팅 문의
            </a>

            <p className="mt-2 text-sm text-white/70">
              소식은 인스타그램에서 확인하세요.
            </p>
            {INSTAGRAM.map((ig) => (
              <a
                key={ig.href}
                href={ig.href}
                target="_blank"
                rel="noreferrer"
                className={socialBtn}
              >
                <InstagramIcon />
                <span>{ig.label}</span>
                <span className="ml-auto text-xs text-white/50">{ig.handle}</span>
              </a>
            ))}
          </div>
          </div>
        </div>
      </section>
      </Reveal>
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
      <Reveal>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-vote">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>
          {desc && <p className="mt-2 text-[var(--muted)]">{desc}</p>}
        </div>
      </Reveal>
      {children}
    </section>
  );
}
