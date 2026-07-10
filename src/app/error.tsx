"use client";

// 라우트 렌더 중 오류가 나면(예: 행사 중 Supabase 일시 장애) 기본 Next.js
// 에러 화면 대신 이 안내를 보여준다. reset()으로 재시도만 하면 대개 회복된다.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <span aria-hidden className="text-4xl">
        ⚠️
      </span>
      <h1 className="text-lg font-bold text-ink">일시적인 오류가 발생했어요</h1>
      <p className="text-sm text-[var(--muted)]">
        잠시 후 다시 시도해 주세요. 계속 문제가 생기면 운영진에게 알려주세요.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-[var(--muted)]">
          오류 코드: {error.digest}
        </p>
      )}
      <button type="button" onClick={reset} className="btn-primary mt-2">
        다시 시도
      </button>
    </div>
  );
}
