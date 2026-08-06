import type { Metadata } from "next";
import localFont from "next/font/local";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

// 본문·제목 공용 폰트. 한글 글리프가 유니코드 구간별로 쪼개져 배포되므로
// preload 는 끄고(불필요한 preload 링크 수십 개 방지) swap 으로 받는다.
const plexKR = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${plexKR.variable} ${archivo.variable}`}>
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-5 py-10 max-sm:pb-24">
          {children}
        </main>
      </body>
    </html>
  );
}
