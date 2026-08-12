# Comunicação entre apps

> Como os apps conversam sem compartilhar internals, autoridade ou transações.
> O estado de POC atual e a integração distribuída aprovada são deliberadamente
> distintos.

## Estado atual: POC e demonstração

Os canais existentes provam contratos e fluxos locais:

1. DTOs v1 em `packages/integration/api-contracts`;
2. manifests por `apps/<app>/public-contract.ts`;
3. gateways/connectors app-local;
4. bus tipado em memória em `packages/integration/events`;
5. ExternalLinks em memória ou adapters locais.

Parte dos fluxos usa gateway simulado, bus no processo/browser e histórico em
memória. Isso não é transporte distribuído, entrega durável, deduplicação ou
sucesso persistido. A integração real descrita abaixo pertence principalmente à
Onda 3.

Nas superfícies Hub/MatrizDocs, a POC atual ainda aceita tenant e actor por
headers públicos e não possui `TenantMembership`/`AppGrant` reais para os
helpers de flags. Essa dívida crítica será tratada pelos itens 7–9 da Onda 1;
ela não é compatível com a regra de autoridade do alvo.

## Regras do alvo aprovado

- Nunca importar `apps/<outro-app>/src/**` ou `apps/<outro-app>/app/**`.
- Nunca compartilhar tabela, transaction ou repository de produto entre apps.
- Nunca usar tenant, user, role ou capability de body/query/header público como
  autoridade.
- Toda chamada é autenticada, tenant-scoped, autorizada e observável.
- Falha remota e falta de conectividade são estados reais; sucesso não pode ser
  fabricado.

## Comandos síncronos entre processos — alvo aprovado

Comandos que exigem resposta imediata usam HTTP autenticado. O caller envia:

```text
Authorization: Bearer <access-token>
Idempotency-Key: <chave-estável-da-operação>
traceparent: <W3C-trace-context>
```

O receiver deve:

1. validar token, issuer, audience, expiração e assinatura;
2. construir o `AuthorizationContext` no servidor;
3. conferir membership, app grant e capability para a operação;
4. derivar `tenantId` do token/sessão e do contexto verificado;
5. validar o DTO e rejeitar qualquer tenant divergente presente no payload;
6. persistir resultado idempotente pela combinação de caller/operação/chave;
7. continuar o trace por `traceparent` e sanitizar erros externos.

Headers como `X-Tenant-Id`, `X-User-Id`, `X-Roles` ou equivalentes públicos não
conferem autoridade. Um `tenantId` no payload pode existir por compatibilidade
ou integridade, mas deve ser igual ao contexto server-only e nunca escolhê-lo.

Retries automáticos só são seguros com `Idempotency-Key`. Timeout ou resposta
ambígua não autoriza criar um resultado local de sucesso; o caller consulta a
operação idempotente ou a mantém pendente.

## Eventos duráveis — alvo aprovado

### Outbox transacional app-local

O app produtor grava a mudança do agregado e o registro de outbox na mesma
transaction do seu próprio schema. A outbox guarda ao menos envelope, status,
tentativas, `availableAt`, lease e timestamps. Nenhum bus em memória substitui
essa atomicidade.

### Dispatcher durável

Um worker do app produtor faz polling, adquire lease, publica, renova/expira
lease com segurança e usa backoff. Shutdown deve devolver trabalho não
concluído à fila. Métricas distinguem pendente, em voo, entregue, retry e falha
terminal.

### Inbox, deduplicação e DLQ

Cada consumidor persiste `eventId + consumerAppId` antes ou na mesma transaction
do efeito local. Eventos repetidos não repetem o efeito. Falhas terminais vão
para DLQ com motivo sanitizado, número de tentativas e referência ao envelope.
Replay é uma operação autenticada, auditada, idempotente e explícita; não apaga
o histórico da falha.

## `MatrizEventEnvelopeV2` — alvo aprovado

O envelope v2 é um contrato público da Onda 3, ainda não implementado:

```ts
type MatrizEventEnvelopeV2<TPayload> = {
  id: string
  name: string
  version: "v2"
  sourceApp: string
  tenantId: string
  occurredAt: string
  subject: {
    appId: string
    entityType: string
    entityId: string
  }
  actor: {
    userId: string
    membershipId: string
    sessionId: string
  } | null
  correlationId: string
  causationId: string | null
  traceparent: string
  idempotencyKey: string | null
  payload: TPayload
}
```

Regras de envelope:

- `id` é globalmente único e é a chave de deduplicação.
- `name` identifica o fato de domínio; `sourceApp` é seu owner.
- `tenantId` é obrigatório para evento operacional e deve ser igual ao tenant
  do contexto do produtor, do envelope e do payload quando o payload o repetir.
- `subject` usa referência lógica; não cria FK cross-schema.
- `actor: null` identifica evento de sistema. Quando houver actor, seus IDs
  vêm do contexto server-only.
- correlação, causalidade e trace são preservados em toda publicação e replay.
- `payload` contém um fato ocorrido, não credenciais nem decisão de autoridade.

O envelope atual v1 (`id`, `name`, `version`, `sourceApp`, `tenantId`,
`occurredAt`, `payload`) continua válido durante a migração. V1 e v2 convivem em
contratos versionados; nenhum consumidor faz cast de v1 para v2. Mudança
breaking cria nova versão, e evolução compatível em v2 é apenas aditiva e
opcional. O app owner publica exemplos, validação e janela de depreciação.

## ExternalLinks — alvo aprovado

ExternalLinks vivem atrás de um serviço Core tenant-aware, com persistência em
`core` e contrato público. O serviço:

- recebe `AuthorizationContext` construído no servidor;
- exige capability para criar, consultar ou remover vínculos;
- aplica tenant scope a todas as chaves e queries;
- torna criação idempotente e aplica unicidade lógica;
- armazena IDs opacos e snapshots mínimos, sem ler tabela de outro app;
- não cria FK cross-schema.

O store em memória atual permanece apenas como POC até essa entrega. Um app não
pode contornar o serviço consultando diretamente o schema `core`.

## Fluxos de referência

### Estado atual de demonstração

Spot e Seumei adaptam dados locais para DTOs de Contracts, usam gateways
simulados/in-process, criam ExternalLinks de demonstração e emitem eventos v1 no
bus em memória. Hub reflete o histórico disponível no processo. Esses fluxos
validam shape e boundaries, não durabilidade entre processos.

### Alvo Spot → Contracts → Hub

1. Spot cria a Gig e persiste sua outbox local.
2. A solicitação de contrato chama Contracts por HTTP autenticado e idempotente.
3. Contracts valida capability/contexto e cria o Contract em transaction local.
4. Contracts registra `contract.created` na própria outbox.
5. O serviço Core cria o ExternalLink tenant-scoped sem FK cross-schema.
6. Dispatchers entregam eventos; inbox de cada consumidor deduplica.
7. Hub e Spot atualizam projeções locais, sem acessar o schema de Contracts.

### Alvo Seumei → Contracts → Hub

O fluxo é análogo: Seumei adapta Establishment para o DTO público, Contracts é
dono do Contract e Core é dono do ExternalLink. Cada efeito remoto possui
idempotência e cada projeção possui inbox.

## Operação offline

A edição offline do Seumei Desktop/PWA é alvo aprovado da Onda 4 e ainda não
está entregue. A sincronização será opt-in. Qualquer comando que dependa de
outro processo enquanto não há conectividade fica explicitamente em
`pending_connectivity` na outbox local.

- A UI apresenta o estado pendente; não mostra confirmação remota.
- O retry posterior preserva a mesma chave de idempotência.
- Conflito, rejeição de autorização e falha terminal substituem o estado
  pendente por resultado explícito e auditável.
- Nenhum client cria Contract, ExternalLink ou confirmação remota fictícia para
  simular sucesso offline.

## Anti-padrões

- importar entity ou repository de outro app;
- copiar DTO/evento em vez de consumir o contrato versionado;
- confiar em tenant ou actor enviado pelo client;
- gravar no schema de outro app ou criar FK cross-schema;
- publicar evento antes do commit do agregado;
- executar handler sem inbox/deduplicação;
- replay manual que apaga DLQ ou altera o envelope original;
- tratar timeout, ausência de rede ou fila local como sucesso concluído;
- descrever transports em memória atuais como integração distribuída.
