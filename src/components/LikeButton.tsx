"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { setLike } from "@/app/gallery/actions";

export function LikeButton({
  projectId,
  initialCount,
  loggedIn,
  initialLiked = false,
}: {
  projectId: string;
  initialCount: number;
  loggedIn: boolean;
  initialLiked?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    // 미로그인 시 로그인 페이지로 유도 (돌아올 위치 전달)
    if (!loggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const want = !liked;
    setPending(true);
    // 낙관적 업데이트
    setLiked(want);
    setCount((c) => Math.max(0, c + (want ? 1 : -1)));

    const res = await setLike(projectId, want);
    setPending(false);

    if (res?.error) {
      // 실패 시 롤백
      setLiked(!want);
      setCount((c) => Math.max(0, c + (want ? -1 : 1)));
      return;
    }
    if (typeof res.count === "number") setCount(res.count);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      title={loggedIn ? undefined : "로그인 후 응원할 수 있어요"}
      className={`btn gap-1.5 transition ${
        liked
          ? "bg-vote text-white hover:brightness-95"
          : "btn-ghost hover:border-vote hover:text-vote"
      } disabled:opacity-60`}
    >
      <span className="text-base leading-none">{liked ? "♥" : "♡"}</span>
      응원 {count}
    </button>
  );
}
