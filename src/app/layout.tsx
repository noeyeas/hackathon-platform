import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { RemoteControl } from "@/components/RemoteControl";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "월계동 해커톤",
  description: "기술을 통해 월계동의 내일을 그리다",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [{ data: notices }, { data: schedule }, { data: milestones }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, body, pinned, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("schedule_items")
        .select("id, time_label, starts_at, title")
        .order("starts_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("milestones")
        .select("id, label, target_at")
        .order("target_at", { ascending: true }),
    ]);

  return (
    <html lang="ko">
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-5 py-8">{children}</main>
        <RemoteControl
          notices={notices ?? []}
          schedule={schedule ?? []}
          milestones={milestones ?? []}
        />
      </body>
    </html>
  );
}
