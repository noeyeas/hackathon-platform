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
    <div className="flex flex-none items-center gap-2.5 px-12">
      {org.img ? (
        <img
          src={org.img}
          alt={org.name}
          className={
            org.contain
              ? "h-3.5 w-auto flex-none object-contain"
              : "h-5 w-5 flex-none rounded object-cover"
          }
        />
      ) : (
        <div className="flex h-5 w-5 flex-none items-center justify-center rounded bg-gray-100 text-[7px] font-bold text-[var(--muted)]">
          월
        </div>
      )}
      <div className="whitespace-nowrap">
        <span className="mr-1.5 text-[9px] uppercase tracking-wider text-vote">
          {org.role}
        </span>
        <span className="text-xs font-medium">{org.name}</span>
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
    <div className="bleed overflow-hidden border-b border-[var(--line)] bg-white py-1.5">
      <div className="flex w-max animate-marquee">
        {track.map((org, i) => (
          <Item key={i} org={org} />
        ))}
      </div>
    </div>
  );
}
