/** @type {import('next').NextConfig} */
const nextConfig={transpilePackages:["@matriz/integration-api-contracts","@matriz/integration-registry-core","@matriz/integration-wallet-contracts","@matriz/platform-config","@matriz/platform-db"],reactStrictMode:true,poweredByHeader:false,async headers(){return[{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Cache-Control",value:"no-store"}]}]}}
export default nextConfig
