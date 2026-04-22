/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@matriz/design-ui",
    "@matriz/design-system",
    "@matriz/platform-config",
    "@matriz/platform-storage",
    "@matriz/platform-telemetry",
    "@matriz/access-tenants",
    "@matriz/integration-events",
    "@matriz/integration-registry-core",
    "@matriz/integration-manifests",
    "@matriz/integration-external-links",
    "@matriz/integration-api-contracts",
    "@matriz/flows-onboarding",
    "@matriz/foundation-types",
    "@matriz/foundation-utils",
    "@matriz/foundation-constants",
    "@matriz/foundation-schemas",
  ],
  reactStrictMode: true,
}

export default nextConfig
