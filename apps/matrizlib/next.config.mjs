/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@matriz/flows-onboarding",
    "@matriz/foundation-types",
    "@matriz/integration-api-contracts",
    "@matriz/integration-events",
    "@matriz/integration-registry-core",
    "@matriz/platform-config",
    "@matriz/platform-telemetry",
  ],
  reactStrictMode: true,
}

export default nextConfig
