import { fileURLToPath } from "node:url"

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url))
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  transpilePackages: ["@matriz/design-system", "@matriz/design-ui"],
}

export default nextConfig
