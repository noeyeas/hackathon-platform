/* eslint-disable @next/next/no-img-element */

type Org = { name: string; role: string; img?: string; contain?: boolean };

const ORGS: Org[] = [
  // 기획(안) I-☐행사 개요의 주최 / 협력·후원 목록과 같은 집합을 쓴다.
  // 로고 파일이 없는 곳은 이름만 표시된다(Item 의 텍스트 대체).
  { name: "광운대학교 총학생회 이음", role: "주최", img: "/council.jpg" },
  { name: "인공지능융합대학 학생회 하성", role: "주최", img: "/hasung.jpg" },
  { name: "노원구청", role: "협력·후원" },
  { name: "광운대학교", role: "협력·후원" },
  { name: "월계1동 주민자치회", role: "협력·후원", img: "/people.png", contain: true },
  { name: "카카오페이", role: "협력·후원", img: "/Kakaopay_BI_Primary_Black.png", contain: true },
  { name: "봉사동아리 소원", role: "협력·후원", img: "/sowon.png", contain: true },
  { name: "매니패스트", role: "협력·후원", img: "/manifest.png", contain: true },
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
