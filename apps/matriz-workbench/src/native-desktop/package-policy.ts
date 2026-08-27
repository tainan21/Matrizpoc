const ALLOWED_PREFIXES = [
  "dist/native-desktop/",
  ".next/standalone/",
  ".next/static/",
  "public/",
]

const FORBIDDEN_SEGMENTS = new Set([
  ".matriz",
  ".env",
  "docs",
  "src",
  "logs",
  "node_modules",
  ".turbo",
  "cache",
])

function normalizedSegments(candidate: string): string[] {
  return candidate.replaceAll("\\", "/").split("/").filter(Boolean)
}

export function isPackagedWorkbenchPath(candidate: string): boolean {
  const normalized = normalizedSegments(candidate).join("/")
  if (!ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false
  return !normalizedSegments(candidate).some((segment) => (
    FORBIDDEN_SEGMENTS.has(segment)
    || segment === ".next" && normalized.includes("/.next/cache/")
    || segment.startsWith(".env")
    || segment.endsWith(".log")
  ))
}

export function assertPackagedWorkbenchPath(candidate: string): void {
  if (!isPackagedWorkbenchPath(candidate)) {
    throw new Error(`O caminho ${candidate} não pode entrar no pacote desktop.`)
  }
}
