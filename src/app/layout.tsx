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
  title: "월계동 해커톤",
  description: "기술을 통해 월계동의 내일을 그리다",
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
        <main className="mx-auto w-full max-w-5xl px-5 py-8">{children}</main>
        <RemoteControl
          notices={notices}
          schedule={schedule}
          milestones={milestones}
        />
      </body>
    </html>
  );
}
