import Link from "next/link";
import Image from "next/image";
import { LogoMarquee } from "@/components/LogoMarquee";
import { HeroTimeline } from "@/components/HeroTimeline";
import { Reveal } from "@/components/Reveal";
import { RevealGroup } from "@/components/RevealGroup";
import { getTimeline } from "@/lib/remoteData";
import { formatMonthDayRange } from "@/lib/format";

// 구글 신청 폼 주소. 채우면 아래 ApplyButton 이 자동으로 활성 링크가 되고,
// 비워두면 "준비 중" 비활성 버튼으로 표시된다.
const APPLY_FORM_URL = "https://forms.gle/KDkrR7bC9GgssgAa7";

// 4개 주제 카드(기획(안) II-☐해커톤 주제). 순서·명칭은 기획(안)을 따른다.
// 배경은 웜 아이보리 계열로 낮추고 강조색만 주제별로 다르게 둔다.
const THEMES = [
  { icon: "🏪", t: "상권 활성화", en: "Local Commerce", d: "소상공인과 주민을 디지털로 연결해 월계1동 골목상권의 경쟁력 강화", tint: "#faf4e8", ring: "#ece0c6", chip: "#f1e6cf", accent: "#8a6a12" },
  { icon: "🛡️", t: "생활안전", en: "Public Safety", d: "보행·야간 안전, 재난 대응 등 주민의 일상 안전을 기술로 보완", tint: "#f9f0ee", ring: "#ecd9d3", chip: "#f1e2dd", accent: "#a53a1c" },
  { icon: "♻️", t: "탄소중립 및 ESG", en: "Carbon Neutral", d: "탄소 배출 저감·자원 순환·친환경 생활을 유도하는 플랫폼으로 일상 속 ESG 실현", tint: "#f2f5ef", ring: "#dfe6d8", chip: "#e5ecdd", accent: "#3f6b3a" },
  { icon: "🧩", t: "기타 (지역 연계형)", en: "Open Track", d: "위 세 분야에 속하지 않더라도 월계1동과 연계된 문제라면 자유롭게 제안", tint: "#eff1f7", ring: "#d9dee9", chip: "#e2e7f0", accent: "#2c3767" },
];

// 시상 내역(기획(안) II-☐수상작 시상). 상금 액수는 기획(안) 예산안 기준.
const AWARDS = [
  { medal: "🥇", t: "노원구청장 표창", n: "1팀", money: "100만원", d: "선정 4팀 중 주민투표 1위" },
  { medal: "🥈", t: "광운대학교 총장상", n: "3팀", money: "각 50만원", d: "선정 4팀 중 나머지" },
  { medal: "🎁", t: "매니패스트상", n: "1팀", money: "10만원", d: "매니패스트 이용권 지급 예정" },
];

// 최종 심사 기준(기획(안) II-☐심사 기준 및 위원, 나. 최종 심사 기준표). 합계 100점.
const FINAL_CRITERIA = [
  { t: "실현 & 상용화 가능성", p: 30, d: "실제 지역사회 적용 및 지속 운영 가능 여부" },
  { t: "지역 문제 적합성", p: 20, d: "월계1동 실제 주민 수요 및 문제 해결 적합도" },
  { t: "구현 완성도 & 기술력", p: 20, d: "실제 시연 동작 완성도, 코드 및 GitHub 관리 상태" },
  { t: "창의성 & 차별성", p: 20, d: "아이디어의 독창성 및 기존 서비스 대비 차별점" },
  { t: "발표", p: 10, d: "팀당 5분 발표 시간 엄수 (초과 시 감점)" },
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
    a: "25~30팀을 선정합니다. 신청이 초과되면 전공 다양성과 인원수(4명) 가산점을 기준으로 선정합니다.",
  },
  {
    q: "어떤 주제로 개발하나요?",
    a: "월계1동 지역사회 문제를 해결하는 웹·애플리케이션을 만듭니다. 상권 활성화, 생활안전, 탄소중립 및 ESG, 기타(지역 연계형) — 4개 분야 중에서 정하면 됩니다. 특정 분야에 쏠리지 않도록 주제당 10팀으로 제한할 예정입니다.",
  },
  {
    q: "무엇을 제출해야 하나요?",
    a: "팀당 프로젝트 1개를 제출합니다. 프로젝트 제목과 GitHub 저장소는 필수이고, 데모 링크·데모 영상·참고자료(PDF)는 선택입니다. 마감 전까지는 언제든 수정할 수 있습니다.",
  },
  {
    q: "순위는 어떻게 정해지나요?",
    a: "두 단계로 나뉩니다. 먼저 10.9 최종발표에서 심사위원 평가와 참가 팀 간 상호 평가(2:1)를 합산해 상위 4팀을 선정합니다. 이어서 10.10–10.12 전시 기간에 그 4팀만을 대상으로 주민투표를 진행해, 가장 많은 표를 받은 1팀이 노원구청장 표창을 받고 나머지 3팀이 광운대학교 총장상을 받습니다. 공정성을 위해 실시간 순위·점수는 대회가 끝난 뒤에 공개됩니다.",
  },
  {
    q: "전체 일정과 장소가 어떻게 되나요?",
    a: "모집 9.7–9.14 → 9.16(수) 개회식·OT → 9.28(월) 중간발표·멘토링 → 10.8(목)–10.9(금) 본선(무박 2일) → 10.10(토)–10.12(월) 전시·주민투표 순으로 진행합니다. 장소는 광운대학교 80주년기념관이며, 발표는 310호에서 열립니다.",
  },
];

const KAKAO_OPENCHAT = "https://open.kakao.com/o/sJcelIai";

// 어두운 배경에 어울리는 미니멀 아웃라인 소셜 버튼
const socialBtn =
  "flex w-full items-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/10";

// 신청 폼 CTA. APPLY_FORM_URL 이 있으면 링크, 없으면 "준비 중" 비활성 버튼.
function ApplyButton({
  className,
  label,
  pendingLabel,
}: {
  className: string;
  label: string;
  pendingLabel: string;
}) {
  if (APPLY_FORM_URL) {
    return (
      <a
        href={APPLY_FORM_URL}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      title="신청 폼이 곧 열립니다"
      className={`${className} disabled:cursor-not-allowed`}
    >
      {pendingLabel}
    </button>
  );
}

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
    date: formatMonthDayRange(m.target_at, m.ends_at),
    label: m.label,
    at: m.target_at,
    place: m.place,
  }));

  return (
    <div className="flex flex-col gap-24">
      {/* ===== 히어로 + 하단 마퀴 ===== */}
      <div>
        <section className="bleed relative -mt-10 flex min-h-[420px] flex-col items-center justify-center overflow-hidden px-5 pb-28 pt-12 text-center sm:min-h-[500px] sm:pb-32">
          <Image
            src="/campus.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/70" />

          <div className="hero-in relative flex flex-col items-center gap-4 text-white">
            <h1 className="font-display text-4xl leading-none tracking-tight sm:text-7xl">
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
              기술을 통해 월계1동의 내일을 그리다
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <ApplyButton
                className="btn-primary !rounded-full"
                label="참가 신청하기"
                pendingLabel="참가 신청 준비 중"
              />
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
      <Section eyebrow="Theme" title="해커톤 주제" desc="월계1동을 비롯한 지역사회의 생활 밀착형 문제 해결을 위한 웹·애플리케이션 개발">
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => (
            <div
              key={t.t}
              className="card flex h-full flex-col gap-2 transition hover:-translate-y-1 hover:shadow-md"
              style={{ backgroundColor: t.tint, borderColor: t.ring }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl"
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
              <li>· 총 <b className="text-ink">25~30팀</b> 선정</li>
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
            <p className="text-2xl font-bold">9.7 – 9.14</p>
            <ApplyButton
              className="btn-primary mt-3 w-full"
              label="신청 폼 열기"
              pendingLabel="신청 폼 준비 중"
            />
          </div>
        </RevealGroup>
      </Section>

      {/* ===== 시상 · 심사 (Awards) ===== */}
      <Section
        eyebrow="Awards"
        title="시상 및 심사"
        desc="최종발표 심사로 4팀을 선정하고, 전시 기간 주민투표로 그중 대상을 가립니다."
      >
        <RevealGroup className="grid gap-4 sm:grid-cols-3">
          {AWARDS.map((a) => (
            <div key={a.t} className="card flex h-full flex-col gap-1">
              <span className="text-2xl">{a.medal}</span>
              <h3 className="mt-1 font-bold">{a.t}</h3>
              <p className="text-2xl font-bold text-navy">{a.money}</p>
              <p className="text-sm text-[var(--muted)]">
                {a.n} · {a.d}
              </p>
            </div>
          ))}
        </RevealGroup>

        <Reveal>
          <div className="card">
            <h3 className="mb-1 font-bold">선정 방식</h3>
            <ol className="mb-5 flex flex-col gap-2 text-sm text-[var(--muted)]">
              <li>
                <b className="text-ink">1차 · 10.9 최종발표</b> — 심사위원 평가와
                참가 팀 상호평가를 <b className="text-ink">2 : 1</b> 로 합산해{" "}
                <b className="text-ink">상위 4팀</b> 선정
              </li>
              <li>
                <b className="text-ink">2차 · 10.10–10.12 전시</b> — 선정된 4팀을
                대상으로 주민투표. 1위가 노원구청장 표창, 나머지 3팀이 총장상
              </li>
            </ol>

            <h3 className="mb-1 font-bold">최종 심사 기준</h3>
            <p className="mb-4 text-sm text-[var(--muted)]">
              합계 100점. 팀당 5분 발표 후 질의응답이 진행됩니다.
            </p>
            <ul className="flex flex-col divide-y divide-[var(--line)]">
              {FINAL_CRITERIA.map((c) => (
                <li key={c.t} className="flex items-baseline gap-3 py-2.5">
                  <span className="w-10 flex-none text-right text-lg font-bold tabular-nums text-navy">
                    {c.p}
                  </span>
                  <span className="min-w-0">
                    <b className="font-semibold">{c.t}</b>
                    <span className="mt-0.5 block text-sm text-[var(--muted)]">
                      {c.d}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
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
            <p className="eyebrow !text-gold-bright">FAQ</p>
            <h2 className="mt-2 font-title text-3xl font-bold">자주 묻는 질문</h2>
            <p className="mt-2 text-sm text-white/60">
              문의 전에 여기서 먼저 확인해 보세요.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-lg border border-white/15 bg-white/5 transition hover:border-white/25"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold">
                    <span>{f.q}</span>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 flex-none text-white/50 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
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
            <p className="eyebrow !text-gold-bright">Contact</p>
            <h2 className="mt-2 font-title text-3xl font-bold">문의하기</h2>
            <div className="mt-6">
              <p className="text-sm text-white/60">담당자</p>
              <p className="mt-1 text-2xl font-bold">김세연</p>
              <a href="tel:01039425848" className="mt-1 inline-block text-lg text-white/90">
                📞 010-3942-5848
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-lg bg-white/5 p-6 backdrop-blur">
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
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display mt-2 text-2xl sm:text-3xl">{title}</h2>
          {desc && <p className="mt-2 text-[var(--muted)]">{desc}</p>}
        </div>
      </Reveal>
      {children}
    </section>
  );
}
