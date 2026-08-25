export function safeReturnPath(candidate: string | undefined): string {
  if (
    !candidate ||
    candidate.length > 512 ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate) ||
    !/^\/[A-Za-z0-9/_?&=.%~-]*$/.test(candidate)
  ) {
    return "/"
  }
  return candidate
}
