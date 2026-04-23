# Cross-Repo Integration Model

Status: **conceitual** (adapters prontos, integração real futura).

## Cenário

Hoje a Matrizpoc tem 5 apps no mesmo monorepo. A realidade da holding
exige que **projetos em repositórios diferentes** participem do control
plane — sem que o Hub precise importar código deles.

## Regra-base

> Um projeto externo **nunca** tem código importado pelo Hub. Ele expõe
> um **snapshot JSON** assinado pelo próprio projeto, e o Hub consome via
> `SnapshotPullAdapter`.

Essa regra já é cumprida hoje pela fonte simulada
`Matriz Ventures Registry`. O modelo é idêntico para qualquer repo real.

## Topologias suportadas

### 1. Repo externo publicando snapshot próprio

```
repo:matriz/ventures
  └── /public/institutional/snapshot.json   ← atualizado em CI/CD

Hub
  └── SnapshotPullAdapter
        fetchSnapshot: () => fetch("https://ventures.matriz.example/public/institutional/snapshot.json")
```

O repo externo é dono do formato (`ProjectManifest` v1). Publica a cada
merge na main. O Hub faz pull sob demanda.

### 2. Repo externo expondo API institucional

```
repo:matriz/seumei-real  (futuro)
  └── /api/institutional/manifest.json   ← endpoint vivo

Hub
  └── ApiPullAdapter  (scaffold V1.2, implementação futura)
        fetchManifest: () => fetch(...)
```

Diferença: endpoint vivo vs. arquivo estático. Mesmo contract de saída.

### 3. Repo externo fazendo push (webhook)

```
repo:matriz/contracts-v2
  └── on: deploy
        POST https://hub.matriz.example/api/institutional/webhook
          body: ProjectManifest

Hub
  └── WebhookPushAdapter  (scaffold V1.2, implementação futura)
```

Inversão de controle: o projeto sabe quando algo mudou; o Hub reage.

## Garantias de segurança

Qualquer topologia:

1. **Validação Zod obrigatória**. `ProjectManifest` rejeitado é logged e
   descartado.
2. **Trust level** atribuído pelo Hub, **não** pelo snapshot.
   Um projeto externo não pode se auto-declarar `core`.
3. **Allowlist de origens**. `fetchSnapshot` só aceita URLs de uma lista
   configurada em `platform-config`.
4. **Rate limit** por adapter (conceito).
5. **Assinatura** opcional (HMAC ou JWT) via header `X-Matriz-Signature`
   (conceito).

## Contracts compartilhados

O único artefato que os repos precisam compartilhar com o Hub é o
**shape** de `ProjectManifest v1`. Hoje isso vive em
`packages/integration/api-contracts/v1/institutional/`. Em cenário
cross-repo real:

- Publicar o package como `@matriz/integration-api-contracts` em um
  registry privado (npm/GitHub Packages).
- OU exportar o JSON schema (Zod → JSON Schema) para linguagens não-TS
  consumirem.

A escolha fica para a fase de migração real.

## Versionamento

`ProjectManifest.contractVersion = "v1"`. Se surgir `v2` no futuro:

- Hub mantém adapters para ambos durante a janela de transição (≥ 3
  meses).
- Projetos externos migram no próprio ritmo.
- `SnapshotPullAdapter` pode auto-detectar via `contractVersion` e rotear
  para o validador certo.

## O que é diferente do registry V1.1

O `Registry` original (packages/integration/registry-core) só registra
**apps internos do monorepo** (via `AppManifestDTO`). Ele continua
existindo e fazendo o que sempre fez.

O `InstitutionalRegistry` é **estritamente mais amplo**: aceita qualquer
projeto de qualquer origem, desde que o shape bata com `ProjectManifest`.

Um app interno aparece em **ambos** os registries (via
`LocalContractImportAdapter` + decoração Hub-side). Um projeto externo
aparece **apenas** no `InstitutionalRegistry`.

## Mapeamento para produtos reais da holding

| Produto | Localização hoje | Forma de ingestão futura |
|---|---|---|
| `matriz-hub` | `apps/matriz-hub` (monorepo) | `LocalContractImportAdapter` |
| `spot` POC | `apps/spot` (monorepo) | `LocalContractImportAdapter` |
| Seumei real | repo separado | `SnapshotPullAdapter` ou `ApiPullAdapter` |
| Matriz Holding Site | repo separado | `SnapshotPullAdapter` |
| Parcerias externas | fora da Matriz | `SnapshotPullAdapter` + trust_level baixo |

## Próximos passos (conceitual)

- Publicar `@matriz/integration-api-contracts` em registry privado.
- Implementar de verdade `ApiPullAdapter` e `WebhookPushAdapter` (hoje
  scaffolds que lançam `NotImplementedError`).
- Adicionar CLI `matriz-ingest validate <file>.json` para validar
  snapshots antes de publicar.
- Observabilidade: dashboard de health por fonte ingerida.
