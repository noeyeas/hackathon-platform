/* eslint-disable @next/next/no-img-element */

type Org = { name: string; role: string; img?: string; contain?: boolean };

const ORGS: Org[] = [
  { name: "광운대학교 총학생회 이음", role: "주관", img: "/council.jpg" },
  { name: "인공지능융합대학 학생회 하성", role: "주관", img: "/hasung.jpg" },
  { name: "카카오페이", role: "후원", img: "/kakaopay.jpeg", contain: true },
  { name: "월계동 주민단체", role: "후원", img: "/people.png", contain: true },
];

function Item({ org }: { org: Org }) {
  // 평소엔 흑백+흐리게, 호버하면 컬러로 또렷하게
  const reveal =
    "flex-none opacity-60 grayscale transition duration-500 hover:opacity-100 hover:grayscale-0";
  return (
    <div className="flex flex-none items-center px-10">
      {org.img ? (
        <img
          src={org.img}
          alt={org.name}
          title={`${org.role} · ${org.name}`}
          className={
            org.contain
              ? `${reveal} h-4 w-auto object-contain`
              : `${reveal} h-7 w-7 rounded-full object-cover`
          }
        />
      ) : (
        <span
          title={`${org.role} · ${org.name}`}
          className={`${reveal} whitespace-nowrap text-sm font-bold tracking-tight text-ink`}
        >
          {org.name}
        </span>
      )}
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
    <div className="bleed border-y border-[var(--line)] bg-white py-[1.125rem]">
      <div className="marquee-mask overflow-hidden">
        <div className="flex w-max animate-marquee items-center">
          {track.map((org, i) => (
            <Item key={i} org={org} />
          ))}
        </div>
      </div>
    </div>
  );
}
