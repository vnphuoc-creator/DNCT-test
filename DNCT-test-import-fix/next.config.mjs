/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // pdf-parse / mammoth dùng API Node.js thuần (fs, Buffer...) khi đọc file import câu hỏi —
  // để Next.js không cố bundle chúng cho môi trường edge/browser.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};

export default nextConfig;
