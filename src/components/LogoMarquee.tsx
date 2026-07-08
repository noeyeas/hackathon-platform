/* eslint-disable @next/next/no-img-element */

type Org = { name: string; role: string; img?: string; contain?: boolean };

const ORGS: Org[] = [
  { name: "광운대학교 총학생회 이음", role: "주관", img: "/council.jpg" },
  { name: "인공지능융합대학 학생회 하성", role: "주관", img: "/hasung.jpg" },
  { name: "카카오페이", role: "후원", img: "/kakaopay.jpeg", contain: true },
  { name: "월계동 주민단체", role: "후원" },
];

function Item({ org }: { org: Org }) {
  return (
    <div className="flex flex-none items-center gap-3 rounded-full border border-[var(--line)] bg-white px-4 py-2 shadow-sm">
      {org.img ? (
        org.contain ? (
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gray-50">
            <img
              src={org.img}
              alt={org.name}
              className="h-4 w-auto max-w-6 object-contain"
            />
          </span>
        ) : (
          <img
            src={org.img}
            alt={org.name}
            className="h-7 w-7 flex-none rounded-full object-cover ring-1 ring-[var(--line)]"
          />
        )
      ) : (
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-vote/10 text-[11px] font-bold text-vote">
          월
        </span>
      )}
      <div className="flex flex-col whitespace-nowrap leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-vote">
          {org.role}
        </span>
        <span className="text-xs font-semibold text-ink">{org.name}</span>
      </div>
    </div>
  );
}

// 상단 자동 스크롤(마퀴) 로고 스트립 — 주관·후원 기관
export function LogoMarquee() {
  // 한 세트를 넓은 화면도 채울 만큼 반복(base), 그 base를 2배로 이어 붙여
  // -50% 이동만으로 이음새 없이 무한 순환
  const base = [...ORGS, ...ORGS, ...ORGS];
  const track = [...base, ...base];
  return (
    <div className="bleed border-y border-[var(--line)] bg-[var(--bg)] py-4">
      <div className="marquee-mask overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-4">
          {track.map((org, i) => (
            <Item key={i} org={org} />
          ))}
        </div>
      </div>
    </div>
  );
}
