/* eslint-disable @next/next/no-img-element */

type Org = { name: string; role: string; img?: string; contain?: boolean };

const ORGS: Org[] = [
  // 기획(안) I-☐행사 개요의 주최 / 협력·후원 목록과 같은 집합을 쓴다.
  // 로고 파일이 없는 곳은 이름만 표시된다(Item 의 텍스트 대체).
  { name: "광운대학교 총학생회 이음", role: "주최", img: "/council.jpg" },
  { name: "인공지능융합대학 학생회 하성", role: "주최", img: "/hasung.jpg" },
  // 노원구 CI("문화도시 노원") 원본은 심볼 위에 워드마크가 얹힌 세로 조합형
  // .ai 다. 세로 조합형을 28px 높이에 밀어 넣으면 글자가 뭉개지므로 심볼만
  // 잘라 쓴다(기관명은 alt/title 로 붙는다). 원본은 design/ 에 둔다.
  { name: "노원구청", role: "협력·후원", img: "/nowon.png", contain: true },
  // 광운대 엠블럼은 정사각 캔버스를 꽉 채운 원형이라 가로형 로고와 같은
  // 규칙(contain)을 쓰면 28px 짜리 붉은 점이 된다. 학생회 로고와 같은 원형 규칙으로 둔다.
  { name: "광운대학교", role: "협력·후원", img: "/kwangwoon.jpeg" },
  { name: "월계1동 주민자치회", role: "협력·후원", img: "/people.png", contain: true },
  { name: "카카오페이", role: "협력·후원", img: "/Kakaopay_BI_Primary_Black.png", contain: true },
  { name: "봉사동아리 소원", role: "협력·후원", img: "/sowon.png", contain: true },
  { name: "매니패스트", role: "협력·후원", img: "/manifest.png", contain: true },
  // 원형 엠블럼이라 광운대·학생회와 같은 원형 규칙으로 둔다.
  { name: "전현직총학생회연합", role: "협력·후원", img: "/alliance.png" },
];

function Item({ org }: { org: Org }) {
  // 기관마다 원색이 제각각이라 스트립이 산만해져서 흑백으로 통일한다.
  // 대신 호버하면 원본 색으로 돌아온다. 불투명도는 100 으로 둔다 — 흑백에
  // 반투명까지 겹치면 노원구 CI 처럼 밝은 색 로고가 거의 안 보인다.
  const reveal =
    "flex-none grayscale transition duration-500 hover:grayscale-0 hover:scale-105";
  return (
    <div className="flex flex-none items-center px-10">
      {org.img ? (
        <img
          src={org.img}
          alt={org.name}
          title={`${org.role} · ${org.name}`}
          className={
            org.contain
              ? `${reveal} h-7 w-auto max-w-[4.5rem] object-contain`
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
