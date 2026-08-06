// 브랜드 심볼 — 네이비 원판 위 골드 4각 별.
// 헤더·푸터·운영 콘솔에서 같은 모양을 쓴다.
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full bg-navy ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor">
        <path
          d="M12 2.5c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"
          className="text-gold-bright"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
