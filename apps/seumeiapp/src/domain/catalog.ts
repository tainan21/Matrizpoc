export type ProductType = "SIMPLE" | "CONFIGURABLE"
export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"

export interface ProductVariantInput {
  readonly name: string
  readonly sku?: string | null
  readonly price: string
}

export class InvalidCatalogInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidCatalogInputError"
  }
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export function catalogSlug(value: string): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function normalizeCategoryInput(input: {
  name: string
  slug?: string
  description?: string | null
}): { name: string; slug: string; description: string | null } {
  const name = cleanText(input.name)
  const slug = catalogSlug(input.slug || name)
  if (name.length < 2 || name.length > 80) {
    throw new InvalidCatalogInputError("O nome da categoria deve ter entre 2 e 80 caracteres")
  }
  if (slug.length < 2 || slug.length > 64) {
    throw new InvalidCatalogInputError("O endereço da categoria deve ter entre 2 e 64 caracteres")
  }
  const description = cleanText(input.description || "") || null
  if (description && description.length > 240) {
    throw new InvalidCatalogInputError("A descrição da categoria deve ter até 240 caracteres")
  }
  return { name, slug, description }
}

export function parsePriceToCents(raw: string): number {
  const value = raw.trim()
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new InvalidCatalogInputError("Informe um preço válido com até duas casas decimais")
  }
  const [whole, fraction = ""] = normalized.split(".")
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new InvalidCatalogInputError("O preço precisa ser maior que zero")
  }
  return cents
}

export function normalizeProductInput(input: {
  name: string
  slug?: string
  description?: string | null
  categoryId?: string | null
  type: ProductType
  status: ProductStatus
  variants: readonly ProductVariantInput[]
}) {
  const name = cleanText(input.name)
  const slug = catalogSlug(input.slug || name)
  if (name.length < 2 || name.length > 120) {
    throw new InvalidCatalogInputError("O nome do produto deve ter entre 2 e 120 caracteres")
  }
  if (slug.length < 2 || slug.length > 64) {
    throw new InvalidCatalogInputError("O endereço do produto deve ter entre 2 e 64 caracteres")
  }
  if (input.variants.length === 0) {
    throw new InvalidCatalogInputError("Adicione ao menos uma variante")
  }

  const variants = input.variants.map((variant, position) => ({
    name: input.type === "SIMPLE" ? "Padrão" : cleanText(variant.name),
    sku: cleanText(variant.sku || "").toUpperCase() || null,
    priceCents: parsePriceToCents(variant.price),
    position,
  }))
  const normalizedVariants = input.type === "SIMPLE" ? variants.slice(0, 1) : variants
  if (input.type === "CONFIGURABLE") {
    const names = normalizedVariants.map((variant) => variant.name.toLocaleLowerCase("pt-BR"))
    if (names.some((variantName) => !variantName) || new Set(names).size !== names.length) {
      throw new InvalidCatalogInputError("Cada variante precisa de um nome único")
    }
  }
  const skus = normalizedVariants.flatMap((variant) => variant.sku ? [variant.sku] : [])
  if (new Set(skus).size !== skus.length) {
    throw new InvalidCatalogInputError("Cada SKU precisa ser único")
  }

  return {
    name,
    slug,
    description: cleanText(input.description || "") || null,
    categoryId: input.categoryId || null,
    type: input.type,
    status: input.status,
    variants: normalizedVariants,
  }
}
