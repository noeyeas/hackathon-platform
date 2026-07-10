import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { RemoteControl } from "@/components/RemoteControl";
import { getRemoteData } from "@/lib/remoteData";

// 본문 기본 폰트: Pretendard (한글+라틴 통일, 기기별 편차 제거)
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "45 920",
});

// 히어로 디스플레이 폰트: Archivo Black
const archivo = localFont({
  src: "./fonts/ArchivoBlack.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  // 상대 경로 이미지(og:image)를 절대 URL로 변환하는 기준. 공유 미리보기 필수.
  metadataBase: new URL("https://hackathon-platform-seven.vercel.app"),
  title: "월계동 해커톤",
  description: "기술을 통해 월계동의 내일을 그리다",
  openGraph: {
    // og:image 는 opengraph-image.tsx 가 자동 공급 (1200×630 동적 생성)
    title: "2026 월계동 해커톤",
    description: "기술을 통해 월계동의 내일을 그리다 · 광운대 기념관 319호",
    url: "/",
    siteName: "월계동 해커톤",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    // twitter:image 는 twitter-image.tsx 가 자동 공급
    card: "summary_large_image",
    title: "2026 월계동 해커톤",
    description: "기술을 통해 월계동의 내일을 그리다",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { notices, schedule, milestones } = await getRemoteData();

  return (
    <html lang="ko" className={`${pretendard.variable} ${archivo.variable}`}>
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-5 py-8 max-sm:pb-24">
          {children}
        </main>
        <RemoteControl
          notices={notices}
          schedule={schedule}
          milestones={milestones}
        />
      </body>
    </html>
  );
}
