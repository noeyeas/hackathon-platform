"use client";

import { useEffect, useState } from "react";
import { setLike } from "@/app/gallery/actions";

const ANON_KEY = "gallery_anon_id";
const LIKED_KEY = "gallery_liked";

function readLiked(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) || "[]");
  } catch {
    return [];
  }
}

function getAnonId(): string {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function LikeButton({
  projectId,
  initialCount,
}: {
  projectId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  // 브라우저에 저장된 '내가 누른 목록'으로 초기 상태 복원
  useEffect(() => {
    setLiked(readLiked().includes(projectId));
  }, [projectId]);

  async function toggle() {
    if (pending) return;
    const want = !liked;
    setPending(true);
    // 낙관적 업데이트
    setLiked(want);
    setCount((c) => Math.max(0, c + (want ? 1 : -1)));

    const res = await setLike(projectId, getAnonId(), want);
    setPending(false);

    if (res?.error) {
      // 실패 시 롤백
      setLiked(!want);
      setCount((c) => Math.max(0, c + (want ? -1 : 1)));
      return;
    }
    if (typeof res.count === "number") setCount(res.count);

    // 내가 누른 목록 갱신
    const set = new Set(readLiked());
    if (want) set.add(projectId);
    else set.delete(projectId);
    localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
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
