import "server-only"
import { createOidcCallbackRoute, createOidcLoginRoute, createOidcLogoutRoute, createOidcSessionRoute, createOidcTenantSwitchRoute, type OidcBffConfig } from "@matriz/platform-auth/server"

function required(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value }
export function oidcConfig(): OidcBffConfig { return { issuer: required("MATRIZ_IDENTITY_ISSUER"), clientId: required("CONTRACTS_OIDC_CLIENT_ID"), clientSecret: required("CONTRACTS_OIDC_CLIENT_SECRET"), appId: "contracts", callbackUrl: required("CONTRACTS_OIDC_CALLBACK_URL"), sessionSecret: required("CONTRACTS_SESSION_SECRET") } }
export const login = (request: Request) => createOidcLoginRoute(oidcConfig())(request)
export const callback = (request: Request) => createOidcCallbackRoute(oidcConfig())(request)
export const session = (request: Request) => createOidcSessionRoute(oidcConfig())(request)
export const logout = (request: Request) => createOidcLogoutRoute(oidcConfig())(request)
export const switchTenant = (request: Request) => createOidcTenantSwitchRoute(oidcConfig())(request)
