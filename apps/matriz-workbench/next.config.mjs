import { fileURLToPath } from "node:url"

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  distDir: process.env.WORKBENCH_NEXT_DIST_DIR ?? ".next",
  transpilePackages: [
    "@matriz/design-system",
    "@matriz/foundation-types",
    "@matriz/integration-api-contracts",
    "@matriz/integration-registry-core",
    "@matriz/platform-config",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "256kb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
}

export default nextConfig
