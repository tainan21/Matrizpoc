import {
  distributionCatalogV1Schema,
  type DistributionCatalogV1,
} from "@matriz/integration-api-contracts"

const cacheKey = "matriz-uninstall:distribution-catalog:v1"

export class DistributionCatalogClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetcher: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {}

  async load(): Promise<DistributionCatalogV1> {
    try {
      const response = await this.fetcher(`${this.baseUrl}/api/v1/distribution/catalog`, {
        cache: "no-store",
      })
      if (!response.ok) throw new Error(`Hub respondeu ${response.status}`)
      const catalog = distributionCatalogV1Schema.parse(await response.json())
      try {
        localStorage.setItem(cacheKey, JSON.stringify(catalog))
      } catch {
        /* file:// pode bloquear storage; o catálogo de rede continua válido */
      }
      return catalog
    } catch (networkError) {
      let cached: string | null = null
      try {
        cached = localStorage.getItem(cacheKey)
      } catch {
        /* sem cache persistente neste runtime */
      }
      if (cached) {
        try {
          return distributionCatalogV1Schema.parse(JSON.parse(cached))
        } catch {
          try {
            localStorage.removeItem(cacheKey)
          } catch {
            /* storage bloqueado */
          }
        }
      }
      const detail =
        networkError instanceof Error ? networkError.message : "falha de rede ou validação"
      throw new Error(`Nenhum catálogo confiável está disponível nesta máquina. ${detail}`)
    }
  }
}
