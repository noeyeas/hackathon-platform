"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  // 로그인 전 위치(?redirect=)를 콜백의 next 로 전달해 원래 페이지로 복귀
  function callbackUrl() {
    let next = "";
    if (typeof window !== "undefined") {
      const r = new URLSearchParams(window.location.search).get("redirect");
      if (r && r.startsWith("/")) next = r;
    }
    return `${siteUrl}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="card flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold">로그인 / 가입</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            해커톤 참가를 위해 로그인해 주세요.
          </p>
        </div>

        <button onClick={signInWithGoogle} className="btn-ghost w-full">
          Google 계정으로 계속하기
        </button>

        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--line)]" />
          또는 이메일
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        {sent ? (
          <p className="rounded-lg bg-team/10 px-4 py-3 text-sm text-team">
            {email} 로 로그인 링크를 보냈습니다. 메일함을 확인하세요.
          </p>
        ) : (
          <form onSubmit={signInWithEmail} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button disabled={loading} className="btn-primary w-full">
              {loading ? "전송 중..." : "로그인 링크 받기"}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
