import {
  distributionCatalogV1Schema,
  type DistributionCatalogV1,
} from "@matriz/integration-api-contracts"

const cacheKey = "matriz-uninstall:distribution-catalog:v1"
const freshForMs = 24 * 60 * 60 * 1000
export interface DistributionCatalogSnapshot {
  readonly catalog: DistributionCatalogV1
  readonly source: "hub" | "cache"
  readonly freshness: "fresh" | "stale"
  readonly fetchedAt: string
  readonly message: string
}

export class DistributionCatalogClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetcher: typeof fetch = (...args) => globalThis.fetch(...args),
    private readonly now = () => new Date(),
  ) {}

  async load(): Promise<DistributionCatalogV1> {
    return (await this.loadSnapshot()).catalog
  }

  async loadSnapshot(): Promise<DistributionCatalogSnapshot> {
    try {
      const response = await this.fetcher(`${this.baseUrl}/api/v1/distribution/catalog`, {
        cache: "no-store",
      })
      if (!response.ok) throw new Error(`Hub respondeu ${response.status}`)
      const catalog = distributionCatalogV1Schema.parse(await response.json())
      const fetchedAt = this.now().toISOString()
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ catalog, fetchedAt }))
      } catch {
        /* file:// pode bloquear storage; o catálogo de rede continua válido */
      }
      return { catalog, source: "hub", freshness: "fresh", fetchedAt, message: "Hub conectado; versões stable confirmadas." }
    } catch (networkError) {
      let cached: string | null = null
      try {
        cached = localStorage.getItem(cacheKey)
      } catch {
        /* sem cache persistente neste runtime */
      }
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { catalog?: unknown; fetchedAt?: unknown }
          const catalog = distributionCatalogV1Schema.parse(parsed.catalog ?? parsed)
          const fetchedAt = typeof parsed.fetchedAt === "string" ? parsed.fetchedAt : catalog.generatedAt
          const freshness = this.now().getTime() - new Date(fetchedAt).getTime() <= freshForMs ? "fresh" as const : "stale" as const
          return { catalog, source: "cache", freshness, fetchedAt, message: freshness === "fresh" ? "Hub indisponível; usando a última versão conhecida em cache." : "Hub indisponível; a última versão conhecida está desatualizada. Abra o Hub para confirmar versões atuais." }
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
