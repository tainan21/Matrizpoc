# Plano 4 — Identity, secrets e cache

## Entregas

- Identity loopback em `8080`, JWKS/OIDC/session/CSRF/MFA gerados no vault e
  clientes confidenciais derivados dos contracts.
- Admin recebe `appId`/cliente próprios; todos os BFFs usam callbacks locais
  exatos. Ops exige PlatformOperator ativo.
- Vault protegido pelo Windows; secrets são injetados em memória. Exportação
  para `.env.development.local` é explícita, atômica, ACL-restrita e gitignored.
- Garnet `46379`, ACL por app, chave versionada/app/tenant/namespace e TTL
  obrigatório. Hub deixa de usar Map em memória.

## Testes e gate

Login/logout/refresh/switch/revogação/expiração/denied, vault/redaction/export,
ACL/cache namespaces/TTL e falha opcional/obrigatória. Saída: usuários seed
autenticam somente nos apps autorizados e cache funciona entre processos.

## Incremento 1 — Garnet autenticado e Hub sem Map

- O instalador gera a credencial `matriz_hub` no vault DPAPI e grava no ACL
  somente o hash SHA-256; o usuário default fica desligado e a senha não entra
  em argumentos, configs ou logs do serviço.
- A ACL limita o Hub aos comandos `GET`, `SET`, `DEL`, `EXPIRE` e `PING`.
  Garnet 2.1.5 não implementa a sintaxe Redis de ACL por padrão de chave
  (`~prefix`). Na V1, o namespace é imposto pelo adapter app-local testado;
  cache não contém identidade, autorização ou estado autoritativo. Isolamento
  host-enforced por prefixo exigirá proxy ou instâncias separadas numa revisão.
- O adapter RESP é app-local no Hub, valida endpoint loopback `46379`, usuário,
  senha, namespace, segmentos e TTL de 1 a 86.400 segundos. Payloads permanecem
  limitados a 8 KiB.
- A API `/api/ecosystem/cache` deixou de usar `Map`; mantém autenticação e
  isolamento tenant existentes, persiste no Garnet e responde `503` sanitizado
  quando o cache obrigatório está indisponível.
