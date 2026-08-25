import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { Store, StoreId, StorePublicationContext } from "./store"

export interface TenantStoreRepository {
  get(): Promise<Store | null>
  find(storeId: StoreId): Promise<Store | null>
  save(store: Store): Promise<Store | null>
}

export interface StoreRepository {
  resolvePublished(slug: string): Promise<StorePublicationContext | null>
  bind(context: SeumeiTenantContext): Promise<TenantStoreRepository | null>
}

