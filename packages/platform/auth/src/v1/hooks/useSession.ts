"use client"

import type { AuthSession } from "../types"
import { useAuth } from "./useAuth"

/**
 * Returns the current session or `null`. Does NOT throw when signed out —
 * UI code is expected to branch on status via `useAuthStatus`.
 */
export function useSession(): AuthSession | null {
  return useAuth().session
}
