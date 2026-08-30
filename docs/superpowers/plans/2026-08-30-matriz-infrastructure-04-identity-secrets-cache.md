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

## Incremento 2 — vault local e Identity executável

- O helper Windows resolve apenas `infrastructure.json` validado, gera segredos
  aleatórios e JWKS RSA, protege o store com DPAPI CurrentUser, escreve
  atomicamente e restringe a ACL ao usuário instalador.
- O renderer, recipes e snapshots nunca recebem valores. O processo principal
  filtra a resposta pelas chaves declaradas, injeta secrets apenas em ações de
  runtime e redige valores literais capturados no terminal.
- Contratos agora usam os nomes reais de runtime por schema e declaram issuer,
  client ID e callback locais. Identity recebe os mesmos client secrets que os
  BFFs; `core.oidc_clients` persiste somente SHA-256.
- Admin deixou de reutilizar identidade/variáveis de Seumei e usa
  `appId/clientId` próprios.
- Identity local aceita HTTP somente em `127.0.0.1:8080`, faz bind no loopback
  e possui seed app-local scrypt para owner, operador e usuário sem acesso.
- Ordem explícita: migrations; seed de domínio e registros OIDC; seed de
  credenciais Identity; start Identity; start dos BFFs. Runtime não migra nem
  cria registros privilegiados durante o start.

## Incremento 3 — seed orquestrado pelo Control

- A aba Database oferece o seed somente no Desktop, com preview e token de
  confirmação de uso único válido por cinco minutos.
- Preview e confirmação exigem novamente os três serviços `healthy`, os oito
  ledgers `clean` e um workspace local válido; nenhum runtime executa migration.
- O resolver agrega somente variáveis declaradas nos oito contracts envolvidos,
  recusa valores conflitantes e mantém todas as credenciais fora do renderer.
- A confirmação executa o seed idempotente de domínio e depois o seed scrypt do
  Identity. O ambiente existe apenas na memória dos processos filhos e erros
  passam pela mesma lista de redaction do terminal.
