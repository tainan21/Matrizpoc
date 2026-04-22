import { bootstrapContracts } from "../../bootstrap"

// Eager boot on module import (server-side). Idempotent.
bootstrapContracts()

export function BootstrapGuard(): null {
  return null
}
