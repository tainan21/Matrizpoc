import type { StoreProductView } from "./shared.js"

export function storeProducts(value: unknown): readonly StoreProductView[] {
  const catalog = value as { schemaVersion?: unknown; products?: unknown }
  if (catalog?.schemaVersion !== "v1" || !Array.isArray(catalog.products) || catalog.products.length > 100) throw new Error("Catálogo inválido")
  return catalog.products.map((raw) => {
    const product = raw as Record<string, unknown>
    const release = product.release as Record<string, unknown> | null | undefined
    return {
      productId: bounded(product.productId, 64),
      name: bounded(product.displayName, 120),
      edition: bounded(product.edition, 80),
      state: state(product.state),
      version: release ? version(release.version) : null,
    }
  })
}

function bounded(value: unknown, max: number) {
  if (typeof value !== "string" || !value || value.length > max) throw new Error("Catálogo inválido")
  return value
}

function state(value: unknown): StoreProductView["state"] {
  if (value !== "active" && value !== "unavailable" && value !== "retired") throw new Error("Catálogo inválido")
  return value
}

function version(value: unknown) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) throw new Error("Catálogo inválido")
  return value
}
