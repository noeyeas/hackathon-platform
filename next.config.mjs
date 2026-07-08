/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // PDF 참고자료 업로드 허용 (기본 1MB → 25MB)
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
