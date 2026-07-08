import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { RemoteControl } from "@/components/RemoteControl";

export const metadata: Metadata = {
  title: "해커톤 운영 플랫폼",
  description: "참가 신청부터 제출·투표·집계까지",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-5 py-8">{children}</main>
        <RemoteControl />
      </body>
    </html>
  );
}
