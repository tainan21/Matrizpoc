"use client"

import * as React from "react"
import { AuthContext, type AuthContextValue } from "../provider/auth.context"

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error(
      "[@matriz/platform-auth] useAuth() must be used inside <AuthProvider>",
    )
  }
  return ctx
}
