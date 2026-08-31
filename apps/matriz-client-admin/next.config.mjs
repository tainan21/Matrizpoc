/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"], reactStrictMode: true, poweredByHeader: false,
  transpilePackages: ["@matriz/integration-api-contracts", "@matriz/integration-registry-core", "@matriz/platform-auth", "@matriz/platform-config"],
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ] }] },
}
export default nextConfig
