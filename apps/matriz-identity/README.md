# Matriz Identity

Serviço Node responsável pelo provedor OIDC da plataforma. Expõe discovery,
JWKS, Authorization Code com PKCE S256, refresh tokens rotativos e revogação.

## Ownership

- Possui a semântica de identidade global e acessa somente o schema `core`.
- Resolve `TenantMembership` e `AppGrant` no servidor; valores públicos de
  tenant, papel ou capability nunca conferem autoridade.
- Expõe apenas o manifest em `public-contract.ts`; seus internals não podem ser
  importados por outros apps.
- Não possui regras de produto de Hub, Spot, Seumei, Contracts ou WillDash.

## Configuração

`IDENTITY_ISSUER`, `IDENTITY_SIGNING_JWKS`, `CORE_RUNTIME_DATABASE_URL`,
`IDENTITY_CSRF_SECRET`, `IDENTITY_COOKIE_KEYS`,
`IDENTITY_MFA_ENCRYPTION_KEY` e `IDENTITY_AUTHENTICATOR_MODULE` são
obrigatórios. A chave JWKS privada deve vir do vault/Secret Manager, nunca do
Git ou de logs. Clientes e callbacks exatos vêm do catálogo
`core.oidc_clients`; o banco guarda apenas fingerprints de client secrets.

No perfil local, o Control gera e injeta esses valores em memória. O HTTP é
aceito exclusivamente na origem `http://127.0.0.1:8080`, e o processo faz bind
somente em `127.0.0.1`. Depois do seed de domínio/OIDC, execute
`pnpm --filter @matriz/app-matriz-identity seed:local` com o ambiente resolvido
pelo Control para criar hashes das credenciais owner, operador e sem acesso.

## Operação

Cloud Run usa a porta em `PORT`, encaminha TLS pelo proxy confiável e consulta
`/healthz`. Tokens têm cache privado/no-store. O serviço não usa Web Storage.
