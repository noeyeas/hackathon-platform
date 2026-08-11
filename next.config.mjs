/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 참고자료가 링크 방식으로 전환되어 대용량 업로드가 없다.
  // 서버 액션 바디 한도는 기본값(1MB)으로 충분.

  // 전 경로 공통 보안 헤더.
  // 스크립트를 제한하는 CSP(script-src)는 넣지 않았다 — Next.js 가 하이드레이션에
  // 인라인 스크립트를 쓰므로 nonce 배선 없이 켜면 사이트가 통째로 멈춘다.
  // 여기서는 배선 없이도 안전하게 켤 수 있는 것만 둔다.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 클릭재킹 차단. 운영 콘솔이 남의 iframe 에 실려 조작되는 것을 막는다.
          // X-Frame-Options 는 구형 브라우저용 중복 방어.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          // 확장자 대신 내용으로 타입을 추측하는 동작 차단(MIME 스니핑).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 외부 링크(제출작의 GitHub·데모 주소)로 나갈 때 경로를 넘기지 않는다.
          // /gallery/<제출작 id> 같은 내부 경로가 리퍼러로 새는 것을 막는다.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 쓰지 않는 장치 권한은 미리 닫아둔다.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
