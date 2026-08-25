/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@matriz/access-tenants", "@matriz/design-system", "@matriz/design-ui",
    "@matriz/flows-auth", "@matriz/flows-ecosystem", "@matriz/flows-onboarding",
    "@matriz/foundation-types", "@matriz/integration-api-contracts",
    "@matriz/integration-manifests", "@matriz/integration-registry-core",
    "@matriz/platform-auth", "@matriz/platform-config", "@matriz/platform-db"
  ],
  reactStrictMode: true,
}

export default nextConfig
