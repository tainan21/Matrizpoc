import type { Product } from "../../domain/catalog"
import type { StoreDesignDraftRecord } from "../../domain/repositories/store-design-repository"
import { STORE_IDENTITY_PRESETS, getStoreIdentityPreset } from "../../domain/store-identity"
import { money } from "./commerce.presenter"

export function toStoreDesignViewModel(draft: StoreDesignDraftRecord) {
  return {
    storeSlug: draft.storeSlug,
    displayName: draft.displayName,
    preset: draft.preset,
    headline: draft.headline,
    announcement: draft.announcement,
    description: draft.description,
    heroImageUrl: draft.heroImageUrl ?? "",
    draftVersion: draft.draftVersion,
    isPublished: draft.isPublished,
    statusLabel: draft.isPublished && draft.publishedVersion ? `Publicado · versão ${draft.publishedVersion.version}` : "Rascunho privado",
    publicUrl: `/store/${draft.storeSlug}`,
    presets: STORE_IDENTITY_PRESETS,
  }
}

export function toPrivateStorePreviewViewModel(draft: StoreDesignDraftRecord, products: readonly Product[]) {
  const preset = getStoreIdentityPreset(draft.preset)
  return {
    storeSlug: draft.storeSlug, displayName: draft.displayName, description: draft.description, version: draft.draftVersion,
    preset: draft.preset, headline: draft.headline, announcement: draft.announcement, heroImageUrl: draft.heroImageUrl,
    theme: { displayFamily: preset.displayFamily, tokens: preset.tokens },
    products: products.filter(({ status }) => status === "ACTIVE").flatMap((product) => product.variants.filter(({ isActive }) => isActive).map((variant) => ({ productId: product.id, variantId: variant.id, name: product.name, description: product.description, priceCents: variant.priceCents, price: money(variant.priceCents), imageUrl: product.images[0]?.url ?? null, imageAlt: product.images[0]?.altText ?? null, availableQuantity: 1, availabilityLabel: "Produto do catálogo" }))),
  }
}
