/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 제출 폼이 예시 이미지(최대 5MB, 0041)를 서버 액션으로 올린다.
  // 기본 바디 한도(1MB)로는 업로드가 막히므로 여유를 둬 올린다.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },

  // 개발 중 같은 와이파이의 폰으로 확인할 때 쓰는 LAN 주소.
  //
  // 전시 주민투표(/exhibit)는 폰으로 QR 을 찍는 화면이라 실제 기기에서
  // 눌러봐야 한다. 그런데 Next 15 부터 dev 리소스(JS 청크·폰트)에 대한
  // 교차 출처 요청을 기본 차단해서, LAN 주소로 열면 HTML 은 그려지지만
  // 하이드레이션이 안 돼 아무것도 눌리지 않는다 — 화면은 멀쩡해 보이므로
  // 원인을 찾기 어렵다.
  //
  // 개발 전용 설정이라 배포 빌드에는 영향이 없다. 공유기에서 주소를 새로
  // 받으면(DHCP) 여기 값을 함께 고쳐야 한다.
  allowedDevOrigins: ["172.100.1.11"],

  // 예시 이미지는 Supabase Storage 공개 URL에서 온다.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },

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
