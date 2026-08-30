# Plano 4 — Identity, secrets e cache

## Entregas

- Identity loopback em `8080`, JWKS/OIDC/session/CSRF/MFA gerados no vault e
  clientes confidenciais derivados dos contracts.
- Admin recebe `appId`/cliente próprios; todos os BFFs usam callbacks locais
  exatos. Ops exige PlatformOperator ativo.
- Vault protegido pelo Windows; secrets são injetados em memória. Exportação
  para `.env.development.local` é explícita, atômica, ACL-restrita e gitignored.
- Garnet `56379`, ACL por app, chave versionada/app/tenant/namespace e TTL
  obrigatório. Hub deixa de usar Map em memória.

## Testes e gate

Login/logout/refresh/switch/revogação/expiração/denied, vault/redaction/export,
ACL/cache namespaces/TTL e falha opcional/obrigatória. Saída: usuários seed
autenticam somente nos apps autorizados e cache funciona entre processos.
