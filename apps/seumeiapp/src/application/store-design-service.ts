import type { AuthorizedCompanyContext } from "./company-onboarding"
import { can } from "../domain/membership"
import type { StoreDesignRepository } from "../domain/repositories/store-design-repository"
import { validateStoreIdentityDraft, type StoreIdentityDraftInput } from "../domain/store-identity"

export class StoreDesignCapabilityDeniedError extends Error { constructor() { super("Sua função não permite acessar a identidade da loja"); this.name = "StoreDesignCapabilityDeniedError" } }
export class InvalidStoreDesignCommandError extends Error { constructor() { super("Versão da identidade visual inválida"); this.name = "InvalidStoreDesignCommandError" } }

function requireCapability(context: AuthorizedCompanyContext, capability: "store.design.read" | "store.design.manage" | "store.publish") { if (!can(context.role, capability)) throw new StoreDesignCapabilityDeniedError() }
function version(value: number) { if (!Number.isSafeInteger(value) || value < 1) throw new InvalidStoreDesignCommandError(); return value }

export function readStoreDesign(context: AuthorizedCompanyContext, repository: StoreDesignRepository) {
  requireCapability(context, "store.design.read")
  return repository.readOrCreateDraft(context.company.tenantId, context.company.id, { storeSlug: context.company.slug, displayName: context.company.name, description: `Conheça ${context.company.name} e faça uma compra simulada.` })
}

export function saveStoreDesign(context: AuthorizedCompanyContext, input: StoreIdentityDraftInput & { readonly expectedVersion: number }, repository: StoreDesignRepository) {
  requireCapability(context, "store.design.manage")
  return repository.saveDraft(context.company.tenantId, context.company.id, version(input.expectedVersion), validateStoreIdentityDraft(input))
}

export function publishStoreDesign(context: AuthorizedCompanyContext, expectedVersion: number, repository: StoreDesignRepository) {
  requireCapability(context, "store.publish")
  return repository.publishDraft(context.company.tenantId, context.company.id, version(expectedVersion), context.userId)
}

export function unpublishStoreDesign(context: AuthorizedCompanyContext, expectedVersion: number, repository: StoreDesignRepository) {
  requireCapability(context, "store.publish")
  return repository.unpublish(context.company.tenantId, context.company.id, version(expectedVersion))
}
