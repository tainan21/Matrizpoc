import { seumeiPortfolioV1Schema, type SeumeiPortfolioV1 } from "@matriz/integration-api-contracts"
import { monorepoConfig } from "@matriz/platform-config"

type PortfolioResponse = { readonly ok: boolean; readonly status: number; json(): Promise<unknown> }
export type PortfolioFetcher = (url: string, init: { readonly headers: Record<string, string>; readonly cache: "no-store" }) => Promise<PortfolioResponse>
export type SeumeiPortfolioResolution =
  | { readonly kind: "ready"; readonly portfolio: SeumeiPortfolioV1 }
  | { readonly kind: "signed-out" }
  | { readonly kind: "unavailable" }

export async function loadSeumeiPortfolio(
  cookie: string,
  fetcher: PortfolioFetcher = fetch,
  seumeiOrigin: string = monorepoConfig.baseUrls.seumei,
): Promise<SeumeiPortfolioResolution> {
  try {
    const response = await fetcher(`${seumeiOrigin}/api/public/v1/portfolio`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    })
    if (response.status === 401) return { kind: "signed-out" }
    if (!response.ok) return { kind: "unavailable" }
    const parsed = seumeiPortfolioV1Schema.safeParse(await response.json())
    return parsed.success ? { kind: "ready", portfolio: parsed.data } : { kind: "unavailable" }
  } catch {
    return { kind: "unavailable" }
  }
}
