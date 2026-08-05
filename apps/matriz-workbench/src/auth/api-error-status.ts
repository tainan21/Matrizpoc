export function apiStatusForWorkspaceError(error: { readonly code: string }): number {
  if (error.code === "NOT_FOUND") return 404
  if (error.code === "CONFLICT") return 409
  if (error.code === "RATE_LIMITED") return 429
  if (error.code === "LIMIT_EXCEEDED") return 413
  return 400
}
