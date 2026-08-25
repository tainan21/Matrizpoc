import type { StoreIdentityDraftInput, StoreIdentityPresetId } from "../store-identity"

export type StorePublicationVersionRecord = {
  readonly id: string
  readonly tenantId: string
  readonly publicationId: string
  readonly version: number
  readonly storeSlug: string
  readonly displayName: string
  readonly preset: StoreIdentityPresetId
  readonly headline: string
  readonly announcement: string
  readonly description: string
  readonly heroImageUrl: string | null
  readonly publishedByUserId: string
  readonly publishedAt: string
}

export type StoreDesignDraftRecord = StoreIdentityDraftInput & {
  readonly publicationId: string
  readonly tenantId: string
  readonly companyId: string
  readonly storeSlug: string
  readonly displayName: string
  readonly draftVersion: number
  readonly isPublished: boolean
  readonly publishedVersion: StorePublicationVersionRecord | null
}

export interface StoreDesignRepository {
  readOrCreateDraft(tenantId: string, companyId: string, defaults: { readonly storeSlug: string; readonly displayName: string; readonly description: string }): Promise<StoreDesignDraftRecord>
  saveDraft(tenantId: string, companyId: string, expectedVersion: number, draft: StoreIdentityDraftInput): Promise<StoreDesignDraftRecord | null>
  publishDraft(tenantId: string, companyId: string, expectedVersion: number, actorUserId: string): Promise<StoreDesignDraftRecord | null>
  unpublish(tenantId: string, companyId: string, expectedVersion: number): Promise<StoreDesignDraftRecord | null>
  findVersion(tenantId: string, versionId: string): Promise<StorePublicationVersionRecord | null>
}
