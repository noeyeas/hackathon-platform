"use client";

import { Children, useEffect, useRef, useState } from "react";

// 배경이 화면에 고정된 채, 스크롤 진행도에 따라 자식 패널이 제자리에서
// 크로스페이드로 전환됨 (화면은 내려가지 않고 내용만 바뀜).
export function PinnedHero({
  bgSrc,
  children,
}: {
  bgSrc: string;
  children: React.ReactNode;
}) {
  const panels = Children.toArray(children);
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const dist = el.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(dist, 1));
      const p = dist > 0 ? scrolled / dist : 0;
      const idx = Math.min(panels.length - 1, Math.floor(p * panels.length));
      setActive(idx);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [panels.length]);

  return (
    <section
      ref={ref}
      className="bleed relative -mt-8"
      style={{ height: `${panels.length * 100}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* 고정 배경 */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgSrc}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/70" />

        {/* 크로스페이드 패널 */}
        {panels.map((panel, i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center px-5 text-white transition-opacity duration-700 ease-out"
            style={{
              opacity: i === active ? 1 : 0,
              pointerEvents: i === active ? "auto" : "none",
            }}
            aria-hidden={i !== active}
          >
            {panel}
          </div>
        ))}

        {/* 스크롤 안내 */}
        <div
          className="scroll-cue absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 transition-opacity duration-500"
          style={{ opacity: active < panels.length - 1 ? 1 : 0 }}
        >
          <span className="text-2xl">⌄</span>
        </div>
      </div>
    </section>
  );
}
