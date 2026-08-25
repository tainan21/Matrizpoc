/**
 * Owner presenter (L6).
 *
 * The page receives only display data, keeping Seumei entities app-internal.
 */
import type { Establishment, OwnerProfile } from "../../domain/models"

export interface OwnerViewModel {
  id: string
  ownerName: string
  email: string
  phoneDisplay: string
  bio: string
  establishmentName: string
  establishmentLocation: string
}

export function toOwnerViewModel(
  owner: OwnerProfile,
  establishment: Establishment,
): OwnerViewModel {
  return {
    id: owner.id as unknown as string,
    ownerName: owner.ownerName,
    email: owner.email,
    phoneDisplay: owner.phone ?? "Nao informado",
    bio: owner.bio,
    establishmentName: establishment.name,
    establishmentLocation: establishment.city,
  }
}
