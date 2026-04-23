# Migration Strategy — V1.x → Produtos reais

Status: **conceitual**. Alinha como a POC atual evolui para produtos
reais sem reescrita.

## Ponto de partida (V1.2)

- 5 apps POC no monorepo (`matriz-hub`, `spot`, `seumei`, `contracts`,
  `willdash`).
- Auth compartilhada real (V1.1, smoke-tested).
- Contracts técnicos (V1.1) + contracts institucionais (V1.2).
- `InstitutionalRegistry` + 3 ingestion adapters funcionais + 3
  scaffolds.
- Hub como control plane + superfície pública `/public`.
- Fonte externa simulada provando ingestão heterogênea.

## Estratégia-mãe

> **Nada é migrado "de uma vez". Cada produto real migra no próprio
> ritmo via os mesmos contracts já existentes.**

O que preserva essa possibilidade:

1. `ProjectManifest` é **idêntico** para app interno e repo externo.
2. `SnapshotPullAdapter` já consome fontes externas hoje (Matriz Ventures).
3. Trust level e source classification são atribuídos pelo Hub, não pelo
   projeto — migração não depende do projeto mudar self-declaration.
4. Domain code do app continua intocado no processo.

## Fases de migração por produto

### Fase A — Produto ainda no monorepo POC

Estado: hoje, para todos os 5 apps.
- Ingestão: `LocalContractImportAdapter`.
- Trust: `core`.
- SourceType: `internal_monorepo_app`.

### Fase B — Produto extraído para repo próprio

Primeiro candidato realista: **Seumei real**.

Passos:
1. Criar repo `matriz/seumei-real`.
2. Copiar `apps/seumei` para lá (sem dependências do monorepo que não
   sejam contracts publicáveis).
3. No novo repo, adicionar endpoint `/public/institutional/snapshot.json`
   retornando um `ProjectManifest` válido.
4. No Hub (este monorepo), trocar:
   ```
   // De:
   createLocalContractImportAdapter({ apps: [..., { manifest: seumeiManifest, decoration }] })
   // Para:
   createSnapshotPullAdapter({
     id: "snapshot:seumei-real",
     sourceHint: "matriz-seumei-real",
     supports: ["internal_monorepo_app"], // ainda "core", só fonte diferente
     fetchSnapshot: async () => fetch("https://seumei.matriz.example/public/institutional/snapshot.json").then(r => r.json()),
   })
   ```
5. Remover `apps/seumei` do monorepo.

**Durante a transição** (≤ 2 semanas), ambos podem coexistir: o Hub
recebe o mesmo projeto via dois adapters, e o `replaceAll` do registry
faz dedup por `projectId` (último wins).

### Fase C — Produto em produção sério

- Adicionar `ApiPullAdapter` (hoje scaffold) para consumo ao vivo.
- Adicionar `WebhookPushAdapter` para invalidação imediata.
- Subir trust level para `verified` ou manter `core` conforme SLA.
- Adicionar métricas reais via endpoint próprio (não mais decoration
  hardcoded).

### Fase D — Produtos de terceiros (parcerias)

- SourceType: `trusted_external_app` ou `third_party_service`.
- Trust: `verified` ou `community`.
- Ingestão: `SnapshotPullAdapter` com allowlist de domínios.
- Validação Zod estrita; rejeição registrada em `/health` do Hub.

## O que NÃO muda na migração

- O shape do `ProjectManifest`.
- A estrutura de páginas do Hub.
- O smoke test institucional-registry (continua cobrindo forma, não
  origem).
- A política L1–L12.

## Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Repo externo publica manifest quebrado | Zod rejeita + log em `rejected[]` — projeto some do Hub, não corrompe |
| Repo externo fica offline | `SnapshotPullAdapter` retorna erro + último snapshot permanece no registry |
| Drift de contract v1 → v2 | Campo `contractVersion` dispara validador certo |
| Perda de performance em muitos adapters | Pipeline paralelizável (conceito) |

## Ordem sugerida de migração

1. **Seumei** (maior apetite de evolução, domínio mais complexo).
2. **Contracts** (centraliza lógica jurídica — pode virar SaaS
   independente).
3. **Spot** (produto público, alto valor de landing institucional).
4. **Willdash** (produto pessoal, menor urgência).
5. **Hub** permanece no monorepo como control plane — não migra.

## Critério de "done" por produto

- [ ] Repo próprio com CI.
- [ ] Endpoint `/public/institutional/snapshot.json` validado por Zod.
- [ ] Hub consome via `SnapshotPullAdapter` e renderiza em `/projects`
      com paridade visual à decoração antiga.
- [ ] Smoke do Hub continua verde.
- [ ] App removido do monorepo POC.
- [ ] Documentação atualizada (`package-categories.md`,
      `ownership-map.md`).

## Não-objetivos

- Migrar banco de dados (cada app já tem schema próprio — L1).
- Unificar UI (design system já é compartilhado via package).
- Criar novo contract para migração (os existentes bastam).
