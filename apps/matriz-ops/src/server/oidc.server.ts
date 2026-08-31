import "server-only"
import {
  createOidcCallbackRoute,
  createOidcLoginRoute,
  createOidcLogoutRoute,
  createOidcSessionRoute,
  resolveOidcServerSessionDurable,
} from "@matriz/platform-auth/server"
import { oidcConfig } from "./oidc-config"

export const login = (request: Request) => createOidcLoginRoute(oidcConfig())(request)
export const callback = (request: Request) => createOidcCallbackRoute(oidcConfig())(request)
export const session = (request: Request) => createOidcSessionRoute(oidcConfig())(request)
export const logout = (request: Request) => createOidcLogoutRoute(oidcConfig())(request)
export const resolveSession = (request: Request) => resolveOidcServerSessionDurable(request, oidcConfig())
