/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 참고자료가 링크 방식으로 전환되어 대용량 업로드가 없다.
  // 서버 액션 바디 한도는 기본값(1MB)으로 충분.
};

export default nextConfig;
