import Link from "next/link";

// 존재하지 않는 주소로 접근했을 때의 안내. 기본 404 대신 홈으로 유도한다.
export default function NotFound() {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <span aria-hidden className="text-4xl">
        🧭
      </span>
      <h1 className="text-lg font-bold text-ink">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-[var(--muted)]">
        주소가 바뀌었거나 삭제된 페이지일 수 있어요.
      </p>
      <Link href="/" className="btn-primary mt-2">
        홈으로 가기
      </Link>
    </div>
  );
}
