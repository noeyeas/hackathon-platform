"use client";

import { Children, useEffect, useRef, useState } from "react";

// 뷰포트 진입 시 자식들을 순차(스태거)로 페이드+슬라이드업.
// className 에는 grid 등 레이아웃 클래스를 그대로 전달.
export function RevealGroup({
  children,
  className = "",
  step = 90,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          ob.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-group ${visible ? "is-visible" : ""} ${className}`}
    >
      {Children.map(children, (child, i) => (
        <div
          className="reveal-item h-full"
          style={{ transitionDelay: `${i * step}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
