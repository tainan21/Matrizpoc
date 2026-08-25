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

`IDENTITY_ISSUER`, `IDENTITY_SIGNING_JWKS` e `CORE_RUNTIME_DATABASE_URL` são
obrigatórios. A chave JWKS privada deve vir do Secret Manager, nunca do Git ou
de logs. Clientes e callbacks exatos vêm do catálogo `core.oidc_clients`.

## Operação

Cloud Run usa a porta em `PORT`, encaminha TLS pelo proxy confiável e consulta
`/healthz`. Tokens têm cache privado/no-store. O serviço não usa Web Storage.
