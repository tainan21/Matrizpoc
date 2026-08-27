/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@matriz/design-system", "@matriz/design-ui", "@matriz/integration-api-contracts", "@matriz/integration-registry-core", "@matriz/integration-wallet-contracts", "@matriz/platform-auth", "@matriz/platform-config", "@matriz/platform-db"],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ] }] },
}
export default nextConfig
