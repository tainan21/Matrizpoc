# Matriz Ops

Internal online backoffice on port 3011. It does not share code with Matriz Admin and never owns financial ledger state.

## Web and OIDC configuration

The deployed Ops server authenticates through the Matriz Identity BFF. Configure these values only in the protected server environment:

- `MATRIZ_IDENTITY_ISSUER`: exact HTTPS Identity origin.
- `OPS_OIDC_CLIENT_ID`: confidential client ID (`matriz-ops`).
- `OPS_OIDC_CLIENT_SECRET`: confidential client secret, at least 32 bytes.
- `OPS_OIDC_CALLBACK_URL`: exact HTTPS callback URL ending in `/api/auth/oidc/callback`.
- `OPS_SESSION_SECRET`: session encryption secret, at least 32 bytes.

Register the Identity client with `appId: matriz-ops`, grants `authorization_code` and `refresh_token`, and authentication method `client_secret_basic`. Store only the secret fingerprint in operational records; never place the secret in Git or in the desktop binary. The authenticated user must also have an active, non-revoked `PlatformOperator` record.

The legacy `matriz_ops_session` bootstrap is accepted only when all local E2E controls are explicitly enabled: `MATRIZ_RUNTIME_PROFILE=local`, `OPS_E2E_ENABLED=true`, and `OPS_E2E_SESSION_TOKEN` is present.

## Desktop configuration

Development uses `tauri dev` and starts Next locally on `127.0.0.1:3011`. A release is an online client with a packaged local connection screen; it does not require Node or start a local web server.

Release builds and `package:desktop` fail before producing an executable unless both exact trusted origins are present:

- `MATRIZ_OPS_DESKTOP_URL`: deployed Ops HTTPS origin.
- `MATRIZ_IDENTITY_ISSUER`: deployed Identity HTTPS origin.

Origins must not contain credentials, a path other than `/`, a query, or a fragment. The shell probes `${MATRIZ_OPS_DESKTOP_URL}/api/health`, displays a retryable local fallback when unavailable, and allows navigation only among its packaged asset, Ops, and Identity.
