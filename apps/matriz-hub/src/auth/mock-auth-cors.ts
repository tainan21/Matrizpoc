const AUTHENTICATED_ORIGINS = new Set([
  ...Array.from({ length: 9 }, (_, index) => `http://localhost:${3000 + index}`),
  ...Array.from({ length: 9 }, (_, index) => `http://127.0.0.1:${3000 + index}`),
])

export function isAllowedMockAuthOrigin(origin: string | null): boolean {
  return origin === null || AUTHENTICATED_ORIGINS.has(origin)
}

export function getMockAuthCorsHeaders(origin: string | null): Record<string, string> {
  return {
    ...(origin && AUTHENTICATED_ORIGINS.has(origin) ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  }
}
