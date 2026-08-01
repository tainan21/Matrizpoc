export interface OperationalRedactionPolicy {
  includeFilePaths: boolean
  includeExternalUrls: boolean
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/[A-Za-z]:\\Users\\[^\\\s:]+/gi, "%USERPROFILE%")
    .replace(/\/(?:Users|home)\/[^/\s:]+/g, "$HOME")
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
    .replace(
      /\b(token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    )
}

export function redactOperationalText(
  value: string,
  policy: OperationalRedactionPolicy,
): string {
  let result = redactSensitiveText(value)
  if (!policy.includeExternalUrls) {
    result = result.replace(/https?:\/\/[^\s)\]}>,;]+/gi, "[url omitted]")
  }
  if (!policy.includeFilePaths) {
    result = result
      .replace(/[A-Za-z]:\\[^\s"'`<>|]+/g, "[path omitted]")
      .replace(/\/(?:tmp|var|etc|workspace|repo)\/[^\s"'`<>|]+/g, "[path omitted]")
      .replace(
        /\b(?:apps|packages|src|app|docs|prisma|tooling)\/[A-Za-z0-9._/-]+/g,
        "[path omitted]",
      )
  }
  return result
}
