# Item 20 — Identity prerequisite slice A–C

Scope is limited to `apps/matriz-identity` and the Core Prisma schema/migration.

## HTTP contract

- `POST /api/access/exchange`
  - Authorization: `Bearer <OIDC access token>`
  - JSON input: `{ "tenantId"?: string }`; no role, capability or app input is accepted.
  - The service derives `userId`, `clientId`, authentication metadata and session/grant from the access token, maps `clientId -> OidcClient.appId`, then resolves active `TenantMembership + AppGrant` in Core.
  - Response: `{ user, context, claims, eligibleTenants, switchCsrfToken }`.
- `POST /api/access/switch`
  - Same bearer and JSON input, plus exact allowed origin and `x-csrf-token` returned by exchange.
  - Applies a per-user/client rate limit, resolves authority again, records `TENANT_SWITCHED`, creates a new OIDC Grant and access token, and returns the new token under `tokens`.

The server-derived claims are `tenant_id`, `membership_id`, `tenant_roles`, `app_id`, `app_roles`, `capabilities`, `auth_time`, `acr`, `amr`, and `sid`. Browser-provided authority fields are not parsed.

## MFA

- Runtime HTTP endpoints `POST /api/mfa/enroll`, `/api/mfa/verify`,
  `/api/mfa/challenge` and `/api/mfa/recovery`, bound to the authenticated user.
- RFC 6238 TOTP enrollment URI and SHA-1/6-digit/30-second verification; secrets
  are persisted only as AES-256-GCM authenticated ciphertext using
  `IDENTITY_MFA_ENCRYPTION_KEY` (32 bytes, base64url, supplied by Secret Manager).
- Prisma runtime repository enforces an atomic `lastTotpCounter` compare-and-set
  so a TOTP time step is accepted once across concurrent requests.
- Passkey-ready credential fields (credential ID, public key, sign count, transports).
- Scrypt-hashed recovery codes are checked across active codes, consumed with an
  atomic compare-and-set, and emit `MFA_RECOVERY_USED` only after successful use.
- Successful challenge/recovery issues a fresh, client-bound OIDC token carrying
  `amr: ["pwd", "otp"]`, LoA2 `acr` and a fresh authentication time.
- Login for an account with an active MFA method and tenant switching both enforce
  MFA step-up; tenant switching additionally rejects stale authentication.
- MFA enrollment and successful verification emit identity audit events.

## Tenant switch compensation

`TENANT_SWITCHED` is now recorded only after the replacement OIDC Grant and access
token are successfully issued. An issuance failure propagates without a false
success audit event, preserving compensating semantics.

## Persistence

Migration `202608120007_identity_access_mfa` adds the authoritative OIDC client `appId`, MFA methods, replay counter and hashed recovery codes. No plaintext recovery code column exists.

## Validation

- Identity tests: 10 files / 32 tests passed.
- Identity typecheck passed.
- Identity lint passed.
- Core Prisma schema generated and validated (with a non-secret local placeholder URL for schema parsing only).

No consumer app, `platform-auth`, root configuration, `.matriz` content or commit was touched.
