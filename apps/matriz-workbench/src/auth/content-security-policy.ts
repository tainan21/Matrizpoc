export interface ContentSecurityPolicyOptions {
  development?: boolean
}

export function buildContentSecurityPolicy(
  nonce: string,
  options: ContentSecurityPolicyOptions = {},
): string {
  if (!/^[A-Za-z0-9+/=_-]{16,128}$/.test(nonce)) {
    throw new Error("Invalid CSP nonce.")
  }

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(options.development ? ["'unsafe-eval'"] : []),
  ]
  const connectSources = [
    "'self'",
    "http://localhost:3000",
    ...(options.development ? ["ws:", "wss:"] : []),
  ]

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ")
}
