import type { DistributionProductV1, InstalledProduct, ProductAction, ProductStatus, ProductViewModel } from "../domain/types"

export function presentProducts(catalog: readonly DistributionProductV1[], installed: readonly InstalledProduct[]): ProductViewModel[] {
  const observedByProduct = reconcileInstallations(catalog, installed)
  return catalog.map((product) => {
    const observed = observedByProduct.get(product.productId)
    const newer = Boolean(observed?.version && product.release?.version && compareSemver(product.release.version, observed.version) > 0)
    const status: ProductStatus = observed
      ? observed.publisher === product.windows.publisher ? newer ? "outdated" : "installed" : "inconsistent"
      : product.state === "active" && product.release ? "available" : "unavailable"
    const actions: ProductAction[] = status === "installed" || status === "outdated"
      ? [...(status === "outdated" ? ["update" as const] : []), "reinstall", "uninstall", "cleanup"]
      : status === "available" ? ["install"] : []
    return {
      productId: product.productId,
      title: `${product.displayName} · ${product.edition}`,
      runtime: product.runtime,
      status,
      statusLabel: labels[status],
      installedVersion: observed?.version ?? null,
      availableVersion: product.release?.version ?? null,
      installationId: observed?.installationId ?? null,
      installLocation: observed?.installLocation ?? null,
      estimatedBytes: observed?.estimatedBytes ?? 0,
      trust: product.release ? "stable-signed" : "not-published",
      actions,
    }
  })
}

function reconcileInstallations(catalog: readonly DistributionProductV1[], installed: readonly InstalledProduct[]) {
  const edges = catalog.flatMap((product) => installed.map((observation) => ({ product, observation, score: matchScore(product, observation) })))
    .filter(({ score }) => score > 0).sort((left, right) => right.score - left.score)
  const products = new Set<string>(); const installations = new Set<string>(); const result = new Map<string, InstalledProduct>()
  for (const edge of edges) {
    if (products.has(edge.product.productId) || installations.has(edge.observation.installationId)) continue
    products.add(edge.product.productId); installations.add(edge.observation.installationId); result.set(edge.product.productId, edge.observation)
  }
  return result
}

function matchScore(product: DistributionProductV1, installed: InstalledProduct) {
  const lower = (value: string) => value.toLocaleLowerCase()
  const registryKey = lower(installed.registryKey).split(/[\\/]/).at(-1)
  if (registryKey === lower(product.windows.uninstallKey)) return 3
  if (lower(product.windows.displayName) === lower(installed.displayName)) return 2
  return product.windows.aliases.some((name) => lower(name) === lower(installed.displayName)) ? 1 : 0
}

function compareSemver(left: string, right: string) {
  const values = (version: string) => version.split("-")[0].split(".").map(Number)
  const [l1 = 0, l2 = 0, l3 = 0] = values(left); const [r1 = 0, r2 = 0, r3 = 0] = values(right)
  return l1 - r1 || l2 - r2 || l3 - r3
}

const labels: Record<ProductStatus, string> = {
  installed: "Instalado", outdated: "Atualização disponível", available: "Disponível",
  unavailable: "Sem instalador publicado", inconsistent: "Instalação inconsistente",
}
