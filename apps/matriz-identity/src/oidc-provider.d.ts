declare module "oidc-provider" {
  import type { IncomingMessage, ServerResponse } from "node:http"

  export default class Provider {
    constructor(issuer: string, configuration: Record<string, unknown>)
    proxy: boolean
    callback(): (request: IncomingMessage, response: ServerResponse) => void
    interactionDetails(request: IncomingMessage, response: ServerResponse): Promise<any>
    interactionFinished(request: IncomingMessage, response: ServerResponse, result: Record<string, unknown>, options?: { mergeWithLastSubmission?: boolean }): Promise<void>
    Grant: new (input: { accountId: string; clientId: string }) => {
      addOIDCScope(scope: string): void
      addOIDCClaims(claims: string[]): void
      addResourceScope(indicator: string, scope: string): void
      save(): Promise<string>
    }
    AccessToken: {
      new (input: Record<string, unknown>): { save(ttl?: number): Promise<string> }
      find(token: string): Promise<{ accountId?: string; clientId?: string; grantId?: string; jti?: string; authTime?: number; auth_time?: number; acr?: string; amr?: string[] } | undefined>
    }
  }
}
