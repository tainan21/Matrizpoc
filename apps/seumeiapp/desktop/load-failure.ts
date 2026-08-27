const abortedError = -3

export function shouldShowOfflinePage(errorCode: number, isMainFrame: boolean, validatedUrl: string, allowedOrigins: readonly string[]): boolean {
  if (!isMainFrame || errorCode === abortedError) return false
  try { return allowedOrigins.includes(new URL(validatedUrl).origin) } catch { return false }
}
