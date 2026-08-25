/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@matriz/access-tenants",
    "@matriz/design-system",
    "@matriz/design-ui",
    "@matriz/flows-onboarding",
    "@matriz/foundation-constants",
    "@matriz/foundation-schemas",
    "@matriz/foundation-types",
    "@matriz/foundation-utils",
    "@matriz/integration-api-contracts",
    "@matriz/integration-events",
    "@matriz/integration-external-links",
    "@matriz/integration-manifests",
    "@matriz/integration-registry-core",
    "@matriz/platform-auth",
    "@matriz/platform-config",
    "@matriz/platform-pdf",
    "@matriz/platform-storage",
    "@matriz/platform-telemetry",
  ],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }]
  },
}

export default nextConfig
