"use client"

import type { AuthStatus } from "../types"
import { useAuth } from "./useAuth"

export function useAuthStatus(): AuthStatus {
  return useAuth().status
}
