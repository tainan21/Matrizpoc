import type { TenantId } from "@matriz/foundation-types"

import type { SeumeiUseCases } from "../../application/use-cases"
import type { EstablishmentViewModel } from "./establishment.presenter"
import { toEstablishmentViewModel } from "./establishment.presenter"
import type { OwnerViewModel } from "./owner.presenter"
import { toOwnerViewModel } from "./owner.presenter"

export interface SeumeiDesktopSnapshot {
  readonly metrics: {
    readonly establishments: number
    readonly active: number
    readonly offerings: number
  }
  readonly establishments: readonly EstablishmentViewModel[]
  readonly owners: readonly OwnerViewModel[]
}

export async function toDesktopSnapshot(
  useCases: SeumeiUseCases,
  tenantId: TenantId,
): Promise<SeumeiDesktopSnapshot> {
  const establishments = await useCases.listEstablishments(tenantId)
  const details = await Promise.all(
    establishments.map(async (establishment) => ({
      establishment,
      offerings: await useCases.listOfferings(tenantId, establishment.id),
      owner: await useCases.getOwnerProfile(tenantId, establishment.id),
    })),
  )

  return {
    metrics: {
      establishments: establishments.length,
      active: establishments.filter(({ status }) => status === "active").length,
      offerings: details.reduce((total, item) => total + item.offerings.length, 0),
    },
    establishments: establishments.map(toEstablishmentViewModel),
    owners: details.flatMap(({ establishment, owner }) =>
      owner ? [toOwnerViewModel(owner, establishment)] : [],
    ),
  }
}
