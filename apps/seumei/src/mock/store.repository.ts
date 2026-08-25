import type { MembershipRepository } from "../domains/memberships/domain/membership.repository"
import type {
  StoreRepository,
  TenantStoreRepository,
} from "../domains/store/domain/store.repository"
import type { Store } from "../domains/store/domain/store"
import { FIXTURE_STORES } from "../fixtures/stores"

export function createFixtureStoreRepository(input: {
  readonly memberships: MembershipRepository
}): StoreRepository {
  let stores: Store[] = FIXTURE_STORES.map((store) => ({
    ...store,
    configuration: { ...store.configuration },
    appearance: { ...store.appearance },
  }))

  return {
    async resolvePublished(slug) {
      const store = stores.find(
        (candidate) => candidate.slug === slug && candidate.status === "published",
      )
      return store
        ? Object.freeze({
            storeId: store.id,
            companyId: store.companyId,
            slug: store.slug,
            store,
          })
        : null
    },

    async bind(context) {
      const membership = await input.memberships.find(context.userId, context.companyId)
      if (
        !membership ||
        membership.id !== context.membershipId ||
        membership.status !== "active"
      ) {
        return null
      }

      const bound: TenantStoreRepository = {
        async get() {
          return stores.find((store) => store.companyId === context.companyId) ?? null
        },
        async find(storeId) {
          return (
            stores.find(
              (store) => store.companyId === context.companyId && store.id === storeId,
            ) ?? null
          )
        },
        async save(store) {
          if (store.companyId !== context.companyId) return null
          const index = stores.findIndex(
            (candidate) =>
              candidate.id === store.id && candidate.companyId === context.companyId,
          )
          if (index < 0) return null
          stores = stores.map((candidate, candidateIndex) =>
            candidateIndex === index ? store : candidate,
          )
          return store
        },
      }
      return bound
    },
  }
}

