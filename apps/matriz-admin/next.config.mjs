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
    "@matriz/platform-storage",
    "@matriz/platform-telemetry",
  ],
  reactStrictMode: true,
}

export default nextConfig
