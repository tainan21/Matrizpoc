import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { monorepoConfig } from "@matriz/platform-config"
import { loadSeumeiPortfolio } from "../src/domains/portfolio/application/load-seumei-portfolio"
import { FederationPortfolio, FederationUnavailable } from "../src/domains/portfolio/presentation/FederationPortfolio"
import { toFederationPortfolioViewModel } from "../src/domains/portfolio/presentation/portfolio-presenter"

export const dynamic = "force-dynamic"

export default async function HubLandingPage() {
  const requestHeaders = await headers()
  const resolution = await loadSeumeiPortfolio(requestHeaders.get("cookie") ?? "")
  if (resolution.kind === "signed-out") redirect("/login")
  if (resolution.kind === "unavailable") return <FederationUnavailable />
  return <FederationPortfolio viewModel={toFederationPortfolioViewModel(resolution.portfolio, monorepoConfig.baseUrls.seumei)} seumeiOrigin={monorepoConfig.baseUrls.seumei} />
}
