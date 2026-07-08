"use client";

import { useEffect, useRef } from "react";

// 스크롤 시 배경이 더 느리게 움직이는 패럴럭스 레이어.
// 상하로 넉넉히 확장해 어떤 스크롤 위치에서도 빈틈이 없도록 함.
export function ParallaxBg({
  src,
  speed = 0.28,
}: {
  src: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      el.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 -top-[28%] -bottom-[28%] bg-cover bg-center will-change-transform"
      style={{ backgroundImage: `url('${src}')` }}
    />
  );
}
