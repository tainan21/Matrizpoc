import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { backlogBatchPlanSchema, type BacklogBatchPlan } from "./backlog-batch-importer"
import {
  completeMatrizProgramImporterItem,
  materializeMatrizProgram,
  verifyMatrizProgram,
} from "./matriz-program-materializer"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

const planUrl = new URL("./plans/matriz-program-2026-08-05-v1.json", import.meta.url)

const titles = [
  "Outcome: estabilizar a fundação Matriz",
  "Criar importador seguro de backlog em lote",
  "Materializar o programa de 50 itens no Workbench",
  "Atualizar leis, mapas e Decision Log",
  "Corrigir dependências vulneráveis",
  "Fortalecer CI e matriz de testes",
  "Produzir threat model e inventário de endpoints",
  "Fechar bypasses do Hub, MatrizDocs e MCP",
  "Corrigir writes e consultas tenant-unsafe",
  "Aplicar baseline de segurança Next.js/React",
  "Outcome: operar dados e identidade multi-tenant reais",
  "Provisionar topologia Neon central",
  "Criar migrations independentes por schema",
  "Completar geração e ownership dos Prisma clients",
  "Normalizar identidade, tenants e grants no core",
  "Adicionar constraints multi-tenant compostas",
  "Aplicar roles, grants e RLS obrigatórios",
  "Restaurar ownership app-local dos repositories",
  "Criar o serviço Matriz Identity",
  "Integrar apps, MFA, recuperação e troca de tenant",
  "Outcome: provar comunicação real entre processos",
  "Implementar APIs reais de Contracts",
  "Ligar gateways reais de Spot e Seumei",
  "Persistir ExternalLinks atrás do Core",
  "Implementar outbox transacional app-local",
  "Criar dispatcher/worker durável",
  "Criar inbox, deduplicação e DLQ",
  "Versionar eventos e invariantes de tenant",
  "Implantar observabilidade distribuída",
  "Automatizar E2E cross-process",
  "Outcome: entregar operação essencial offline sincronizável",
  "Formalizar módulos internos e escada de promoção",
  "Modularizar a operação essencial do Seumei",
  "Criar contrato app-local de repository offline",
  "Entregar Seumei Desktop local",
  "Entregar Seumei PWA offline",
  "Implementar vínculo e desbloqueio de dispositivo",
  "Criar servidor de sincronização Seumei",
  "Criar clientes de sync e resolução de conflitos",
  "Validar backup, restauração e piloto offline",
  "Outcome: consolidar os produtos sobre a nova plataforma",
  "Completar Spot e edição Local Show-day",
  "Evoluir operação online do Seumei",
  "Implementar templates versionados e PDF real em Contracts",
  "Completar lifecycle de Contracts",
  "Transformar eventos em metas no WillDash",
  "Transformar Hub em control plane operacional",
  "Consolidar busca e governança do MatrizDocs",
  "Evoluir Sites com criação e publicação controladas",
  "Fechar Workbench e release institucional",
] as const

const acceptanceCriteria = [
  "Itens 2–10 concluídos, vulnerabilidades críticas contidas e baseline arquitetural atualizada.",
  "Dry-run, apply e resume validam schema, 50 chaves, ciclos, pais, dependências, referências, duplicatas e retry parcial.",
  "Cinco fases/iniciativas, 50 V2, cinco V1 preservados, 55 totais e zero duplicação semântica.",
  "Sete apps, Identity, Hub schema, global/tenant-owned, módulos internos, offline e promoção documentados.",
  "Next >=16.2.11, MCP SDK, PostCSS e Sharp corrigidos; nenhum high/critical silencioso.",
  "Audit, Workbench/Sites, Prisma completo, boundaries, builds afetados e working tree limpo.",
  "Rotas, actions, MCP, dados, trust boundaries, auth, CSRF, SSRF, arquivos, cache e mutações classificados.",
  "Autoridade não vem de headers públicos; deny-by-default, auth, limites, rate e erros sanitizados.",
  "Tenant do AuthorizationContext e testes negativos A/B incluindo sugestões e ExternalLinks.",
  "CSP nonce, headers, CSRF/origin, allowlists, cache privado, server-only e error/loading/not-found.",
  "Banco recriável, RLS ativo e login real no Hub e Seumei.",
  "Schemas core/hub/spot/seumei/contracts/willdash, branch CI e credenciais migration/runtime.",
  "prisma/<schema>/schema.prisma+migrations, zero/N-1/deploy/drift.",
  "Seis clients, lazy server-safe, Spot/WillDash incluídos.",
  "TenantMembership, AppGrant, User global, unicidades, revogação, auditoria e clientes OIDC.",
  "[tenantId,id], FKs [tenantId,parentId] e índices tenant-first.",
  "Role por app/schema, contexto transacional e negação cross-tenant/app.",
  "Repos Hub/Seumei/Contracts nos apps; platform-db só técnico.",
  "Node+oidc-provider 9.11.0, PKCE, JWKS/discovery, tokens curtos, rotation, revogação, Neon.",
  "Cinco clientes OIDC, sessão HTTP-only, MFA/recovery auditáveis e switch validado.",
  "Spot→Contracts e Seumei→Contracts entre processos, persistentes e restart/retry safe.",
  "from-gig/from-establishment, Zod, idempotência, capability e transação local.",
  "Sem sucesso fabricado; timeout, retry seguro, indisponibilidade e pending.",
  "Tenant-aware, vínculo idempotente/único, queries scoped, sem FK cross-schema.",
  "Evento na transação do agregado, estado, tentativas, disponibilidade e retenção.",
  "Polling Postgres, leases, backoff, idempotência, shutdown e métricas.",
  "Event IDs persistidos, duplicates ignored, terminal failures e replay controlado.",
  "Envelope v2 com v1, igualdade tenant contexto/envelope/payload e política owner/evolução.",
  "OTel, logs JSON/redaction, Sentry, PostHog sem PII, cross-app traces e métricas.",
  "Login, A/B, ambos flows, restart/retry/duplicate/DLQ e projeções Hub/WillDash.",
  "Desktop/PWA offline, sync, conflitos e restore.",
  "src/modules, public.ts, facade/ports, manifest local, checker e promotion criteria.",
  "Estabelecimentos, catálogo/ofertas, pedidos/atendimentos em fatias verticais app-local.",
  "Offline ID, tenantId, schemaVersion, revision, deviceId, timestamps/tombstone e outbox.",
  "Next local, SQLite encrypted, OS vault, migrations, diagnostics e essential offline.",
  "Installable shell, encrypted IndexedDB/OPFS, Web Crypto, asset-only SW e safe versioning.",
  "Online provisioning, passkey/PIN unlock, expiring local credential, audit/revocation.",
  "Push/pull, monotonic cursor, tombstones, idempotency, revision, tenant/device auth.",
  "Append merge/dedupe, workflow conflicts, noncritical LWW e pending_connectivity.",
  "Corruption/crash/upgrade/skew/revocation/large queue/restore and real pilots.",
  "All apps useful flow, local tests, telemetry and release gate.",
  "Draft→published→confirmed→performed/cancelled, bookings, contract state and limited offline edit.",
  "Owners/members/units/hours/service areas/app permissions; no stock/finance.",
  "Validated editor/variables, immutable versions, deterministic PDF and private storage.",
  "Draft/review/approval/external signature/active/expired/cancelled and immutable audit.",
  "Rebuildable projections, progress/reward rules, dedupe and reprocessing.",
  "Real app/db/Identity/queue/sync health and global catalog with tenant overlays, no sensitive leak.",
  "Tenant-aware search, lifecycle, block/document auth, export and capability-protected MCP.",
  "CLI/editor presets, locale/assets/metadata validation, offline/static preview and promotion gate.",
  "Critical E2E, observed coworking week, real notifications, Linux green, AA/perf/LGPD audit, DR and release checklist.",
] as const

const dependencies = [
  [], [1], [2], [1], [1], [5], [4], [7], [7], [5, 7],
  [1], [4, 6], [12], [13], [12], [13, 15], [16], [14, 16], [15, 17, 18], [19],
  [11], [18, 20], [22], [22], [18, 22], [25], [26], [25, 26], [25, 27], [23, 24, 27, 29],
  [21], [4, 6], [18, 32], [33], [34], [34], [20, 35, 36], [27, 34, 37], [35, 36, 38], [39],
  [31], [30, 32, 40], [30, 33, 40], [22, 30], [29, 44], [27, 29], [17, 29, 30], [8, 17, 29], [10, 32], [30, 40, 42, 43, 44, 45, 46, 47, 48, 49],
] as const

const kinds = [
  "outcome", "feature", "task", "task", "bug", "feature", "task", "bug", "bug", "feature",
  "outcome", "feature", "feature", "bug", "feature", "feature", "feature", "task", "feature", "feature",
  "outcome", "feature", "feature", "feature", "feature", "feature", "feature", "feature", "feature", "feature",
  "outcome", "feature", "feature", "feature", "feature", "feature", "feature", "feature", "feature", "feature",
  "outcome", "feature", "feature", "feature", "feature", "feature", "feature", "feature", "feature", "feature",
] as const

const priorities = [
  "critical", "high", "high", "high", "critical", "critical", "critical", "critical", "critical", "high",
  "critical", "critical", "critical", "high", "critical", "critical", "critical", "high", "critical", "critical",
  "critical", "critical", "critical", "high", "critical", "high", "high", "high", "high", "critical",
  "high", "high", "high", "high", "high", "high", "critical", "critical", "critical", "high",
  "high", "high", "high", "high", "high", "medium", "high", "high", "medium", "critical",
] as const

const roots: string[] = []

async function readPlan(): Promise<BacklogBatchPlan> {
  return backlogBatchPlanSchema.parse(JSON.parse(await readFile(planUrl, "utf8")))
}

function uuidFor(ordinal: number): string {
  return `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-program-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "seumei"), { recursive: true })
  await mkdir(path.join(root, "docs"), { recursive: true })
  await writeFile(path.join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n')
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "matriz-infra-hub" }))
  await writeFile(path.join(root, "README.md"), "# Matriz Infra Hub\n")
  await writeFile(path.join(root, "apps", "seumei", "README.md"), "# Seumei\n")
  await writeFile(path.join(root, "apps", "seumei", "package.json"), JSON.stringify({ name: "@matriz/app-seumei" }))
  await writeFile(path.join(root, "docs", "architectural-laws.md"), "# Architectural laws\n")
  await writeFile(path.join(root, "docs", "app-communication.md"), "# App communication\n")
  await writeFile(path.join(root, "docs", "monorepo-structure.md"), "# Monorepo structure\n")
  const repository = await WorkspaceRepository.create(root)
  await repository.initializeProject("matriz-infra-hub")
  const emptyRoadmap = await repository.getRoadmap("matriz-infra-hub")
  await repository.updateRoadmapScorecards("matriz-infra-hub", [{
    id: `scorecard_${uuidFor(101)}`,
    slug: "docs",
    title: "Matriz Infra Hub · Docs",
    description: "Existing scorecard that materialization must preserve.",
    scope: "ecosystem_docs",
    goals: Array.from({ length: 100 }, (_, index) => ({
      id: `goal_${uuidFor(index + 1)}`,
      ordinal: index + 1,
      title: `Existing goal ${index + 1}`,
      outcome: "",
      category: "architecture" as const,
      score: index === 0 ? 1 as const : 0 as const,
      evidence: index === 0 ? ["README.md"] : [],
    })),
  }], emptyRoadmap.revision)
  const legacyIds: string[] = []
  for (let index = 1; index <= 5; index += 1) {
    const legacy = await repository.createBacklogItem("matriz-infra-hub", {
      title: `Legacy work ${index}`,
      description: "Existing V1 work.",
      priority: "medium",
      tags: ["legacy"],
    })
    legacyIds.push(legacy.id)
  }
  const legacyBytes = new Map(await Promise.all(legacyIds.map(async (id) => [
    id,
    await readFile(path.join(root, ".matriz", "backlog", `${id}.json`), "utf8"),
  ] as const)))
  return { root, repository, legacyIds, legacyBytes }
}

async function matrixSnapshot(root: string): Promise<Record<string, string>> {
  const matrixRoot = path.join(root, ".matriz")
  const entries: Record<string, string> = {}
  const visit = async (folder: string): Promise<void> => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const target = path.join(folder, entry.name)
      if (entry.isDirectory()) await visit(target)
      else entries[path.relative(matrixRoot, target).replaceAll("\\", "/")] = await readFile(target, "utf8")
    }
  }
  await visit(matrixRoot)
  return Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)))
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("canonical Matriz program manifest", () => {
  it("defines the exact 50-item metadata and dependency graph", async () => {
    const raw = await readFile(planUrl, "utf8").then(JSON.parse, () => null)
    if (raw === null) {
      expect(raw).not.toBeNull()
      return
    }
    const plan = backlogBatchPlanSchema.parse(raw)

    expect(plan).toMatchObject({
      schemaVersion: 1,
      batchId: "matriz-program-2026-08-05-v1",
      projectId: "matriz-infra-hub",
      expectedCount: 50,
    })
    expect(plan.items.map((item) => item.key)).toEqual(
      Array.from({ length: 50 }, (_, index) => `matriz-program-v1-${String(index + 1).padStart(2, "0")}`),
    )
    expect(plan.items.map((item) => item.title)).toEqual(titles)
    expect(plan.items.map((item) => item.kind)).toEqual(kinds)
    expect(plan.items.map((item) => item.priority)).toEqual(priorities)
    expect(plan.items.map((item) => item.acceptanceCriteria)).toEqual(
      acceptanceCriteria.map((criterion) => [criterion]),
    )
    expect(plan.items.map((item) => item.dependencies)).toEqual(
      dependencies.map((ordinals) => ordinals.map((ordinal) => `matriz-program-v1-${String(ordinal).padStart(2, "0")}`)),
    )
    expect(plan.items.map((item, index) => item.parentKey)).toEqual(
      Array.from({ length: 50 }, (_, index) => {
        if (index % 10 === 0) return undefined
        const outcomeOrdinal = Math.floor(index / 10) * 10 + 1
        return `matriz-program-v1-${String(outcomeOrdinal).padStart(2, "0")}`
      }),
    )
    expect(new Set(plan.items.map((item) => item.title.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US"))).size).toBe(50)
    for (const [index, item] of plan.items.entries()) {
      expect(item.description.length).toBeGreaterThan(0)
      expect(item.tags.slice(0, 2)).toEqual(["program:matriz-v1", `wave:${Math.floor(index / 10) + 1}`])
      expect(item.tags.length).toBeGreaterThanOrEqual(3)
      expect(item.tags.length).toBeLessThanOrEqual(5)
      expect(item.references).toHaveLength(1)
      expect(item.references[0]?.kind).toBe("repository_file")
      expect(item).not.toHaveProperty("responsible")
      expect(item).not.toHaveProperty("productStatus")
      expect(item).not.toHaveProperty("validationStatus")
    }
  })
})

describe("materializeMatrizProgram", () => {
  it("treats a missing legacy agent-request collection as empty", async () => {
    const { root, repository } = await fixture()
    await rm(path.join(root, ".matriz", "agents"), { recursive: true, force: true })

    await expect(repository.listAgentRequests("matriz-infra-hub")).resolves.toEqual([])
  })

  it("keeps a real workspace byte-identical during dry-run", async () => {
    const { root, repository } = await fixture()
    const before = await matrixSnapshot(root)

    const report = await materializeMatrizProgram(repository, await readPlan(), "dry-run")

    expect(report).toMatchObject({
      mode: "dry-run",
      backlog: { valid: true, createdKeys: [], reusedKeys: [] },
      roadmap: { changed: false, wouldChange: true, phases: 5, initiatives: 5, backlogReferences: 50 },
    })
    expect(await matrixSnapshot(root)).toEqual(before)
  }, 20_000)

  it("reports the materialized program invalid when its canonical receipt is missing", async () => {
    const { root, repository } = await fixture()
    const plan = await readPlan()
    await materializeMatrizProgram(repository, plan, "apply")
    await rm(path.join(root, ".matriz", "imports", `${plan.batchId}.json`))

    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
  }, 60_000)

  it("reports the materialized program invalid when the receipt plan fingerprint is adulterated", async () => {
    const { root, repository } = await fixture()
    const plan = await readPlan()
    await materializeMatrizProgram(repository, plan, "apply")
    const receiptPath = path.join(root, ".matriz", "imports", `${plan.batchId}.json`)
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as { planFingerprint: string }
    receipt.planFingerprint = "0".repeat(64)
    await writeFile(receiptPath, JSON.stringify(receipt))

    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
  }, 20_000)

  it("requires the receipt to belong to the canonical batch and project", async () => {
    const { root, repository } = await fixture()
    const plan = await readPlan()
    await materializeMatrizProgram(repository, plan, "apply")
    const receiptPath = path.join(root, ".matriz", "imports", `${plan.batchId}.json`)
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as { batchId: string; projectId: string }

    await writeFile(receiptPath, JSON.stringify({ ...receipt, batchId: "another-batch" }))
    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
    await writeFile(receiptPath, JSON.stringify({ ...receipt, projectId: "another-project" }))
    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
  }, 20_000)

  it("returns invalid for a structurally adulterated receipt", async () => {
    const { root, repository } = await fixture()
    const plan = await readPlan()
    await materializeMatrizProgram(repository, plan, "apply")
    const receiptPath = path.join(root, ".matriz", "imports", `${plan.batchId}.json`)
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as Record<string, unknown>

    await writeFile(receiptPath, JSON.stringify({ ...receipt, schemaVersion: 2 }))
    await expect(verifyMatrizProgram(repository, plan)).resolves.toMatchObject({ valid: false })
    await writeFile(receiptPath, JSON.stringify({ ...receipt, unexpected: true }))
    await expect(verifyMatrizProgram(repository, plan)).resolves.toMatchObject({ valid: false })
  }, 20_000)

  it("requires exactly the 50 canonical logical keys in the receipt", async () => {
    const { root, repository } = await fixture()
    const plan = await readPlan()
    await materializeMatrizProgram(repository, plan, "apply")
    const receiptPath = path.join(root, ".matriz", "imports", `${plan.batchId}.json`)
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as {
      entries: Record<string, unknown>
    }
    const removed = receipt.entries["matriz-program-v1-50"]
    delete receipt.entries["matriz-program-v1-50"]
    await writeFile(receiptPath, JSON.stringify(receipt))
    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)

    receipt.entries["unexpected-logical-key"] = removed
    await writeFile(receiptPath, JSON.stringify(receipt))
    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
  }, 20_000)

  it("resolves every logical key by its receipt WorkItem ID", async () => {
    const { root, repository } = await fixture()
    const plan = await readPlan()
    await materializeMatrizProgram(repository, plan, "apply")
    const receiptPath = path.join(root, ".matriz", "imports", `${plan.batchId}.json`)
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as {
      entries: Record<string, { workItemId: string }>
    }
    const firstId = receipt.entries["matriz-program-v1-01"].workItemId
    receipt.entries["matriz-program-v1-01"].workItemId = receipt.entries["matriz-program-v1-02"].workItemId
    receipt.entries["matriz-program-v1-02"].workItemId = firstId
    await writeFile(receiptPath, JSON.stringify(receipt))

    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
  }, 20_000)

  it("rejects an adulterated acceptance criterion ID without writes or activity", async () => {
    const { root, repository } = await fixture()
    const plan = await readPlan()
    await materializeMatrizProgram(repository, plan, "apply")
    const receipt = JSON.parse(
      await readFile(path.join(root, ".matriz", "imports", `${plan.batchId}.json`), "utf8"),
    ) as {
      entries: Record<string, { workItemId: string; acceptanceCriterionIds: string[] }>
    }
    const firstEntry = receipt.entries["matriz-program-v1-01"]
    const itemPath = path.join(root, ".matriz", "backlog", `${firstEntry.workItemId}.json`)
    const item = JSON.parse(await readFile(itemPath, "utf8")) as {
      acceptanceCriteria: Array<{ id: string; text: string; completed: boolean }>
    }
    expect(firstEntry.acceptanceCriterionIds).toEqual([item.acceptanceCriteria[0].id])
    item.acceptanceCriteria[0].id = "ac_ffffffff-ffff-4fff-8fff-ffffffffffff"
    await writeFile(itemPath, JSON.stringify(item))
    const beforeReplay = await matrixSnapshot(root)
    const activityBefore = await repository.listActivity(plan.projectId, undefined, 500)

    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
    await expect(materializeMatrizProgram(repository, plan, "apply")).rejects.toThrow()
    await expect(materializeMatrizProgram(repository, plan, "resume")).rejects.toThrow()
    expect(await matrixSnapshot(root)).toEqual(beforeReplay)
    expect(await repository.listActivity(plan.projectId, undefined, 500)).toEqual(activityBefore)
  }, 30_000)

  it("reports invalid when the preserved scorecard diverges from the program baseline", async () => {
    const { repository } = await fixture()
    const plan = await readPlan()
    await materializeMatrizProgram(repository, plan, "apply")
    const roadmap = await repository.getRoadmap(plan.projectId)
    const scorecards = roadmap.scorecards.map((scorecard, scorecardIndex) => ({
      ...scorecard,
      goals: scorecard.goals.map((goal, goalIndex) => scorecardIndex === 0 && goalIndex === 0
        ? { ...goal, score: 0 as const }
        : goal),
    }))
    await repository.updateRoadmapScorecards(plan.projectId, scorecards, roadmap.revision)

    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
  }, 20_000)

  it("creates 50 V2 plus five phases once, preserves V1 and score, and completes only logical item 2 after idempotency", async () => {
    const { root, repository, legacyIds, legacyBytes } = await fixture()
    const plan = await readPlan()
    const scorecardsBefore = (await repository.getRoadmap("matriz-infra-hub")).scorecards

    const applied = await materializeMatrizProgram(repository, plan, "apply")
    const itemsAfterApply = await repository.listWorkItems("matriz-infra-hub")
    const roadmapAfterApply = await repository.getRoadmap("matriz-infra-hub")

    expect(applied).toMatchObject({
      mode: "apply",
      backlog: { createdKeys: expect.any(Array), reusedKeys: [] },
      roadmap: { changed: true, wouldChange: true, phases: 5, initiatives: 5, backlogReferences: 50 },
    })
    expect(applied.backlog.createdKeys).toHaveLength(50)
    expect(itemsAfterApply).toHaveLength(55)
    expect(itemsAfterApply.filter((item) => item.id.startsWith("tsk_"))).toHaveLength(5)
    expect(itemsAfterApply.filter((item) => item.id.startsWith("wi_"))).toHaveLength(50)
    expect(roadmapAfterApply.phases.map((phase) => phase.title)).toEqual([
      "Onda 1 — Contenção e governança",
      "Onda 2 — Banco central e identidade",
      "Onda 3 — Integração distribuída",
      "Onda 4 — Seumei offline desktop e PWA",
      "Onda 5 — Produtos e hardening institucional",
    ])
    expect(roadmapAfterApply.phases.flatMap((phase) => phase.initiatives.map((initiative) => initiative.title))).toEqual([
      "Programa Matriz — Onda 1",
      "Programa Matriz — Onda 2",
      "Programa Matriz — Onda 3",
      "Programa Matriz — Onda 4",
      "Programa Matriz — Onda 5",
    ])
    expect(roadmapAfterApply.phases.every((phase) => phase.initiatives.length === 1)).toBe(true)
    expect(roadmapAfterApply.phases.flatMap((phase) => phase.initiatives).every((initiative) => initiative.backlogIds.length === 10)).toBe(true)
    expect(new Set(roadmapAfterApply.phases.flatMap((phase) => phase.initiatives.flatMap((initiative) => initiative.backlogIds))).size).toBe(50)
    expect(roadmapAfterApply.scorecards).toEqual(scorecardsBefore)
    for (const id of legacyIds) {
      expect(await readFile(path.join(root, ".matriz", "backlog", `${id}.json`), "utf8")).toBe(legacyBytes.get(id))
    }

    const afterApply = await matrixSnapshot(root)
    const secondApply = await materializeMatrizProgram(repository, plan, "apply")
    const resumed = await materializeMatrizProgram(repository, plan, "resume")
    expect(secondApply.backlog.createdKeys).toEqual([])
    expect(secondApply.backlog.reusedKeys).toHaveLength(50)
    expect(secondApply.roadmap.changed).toBe(false)
    expect(resumed.backlog.createdKeys).toEqual([])
    expect(resumed.backlog.reusedKeys).toHaveLength(50)
    expect(resumed.roadmap.changed).toBe(false)
    expect(await matrixSnapshot(root)).toEqual(afterApply)

    let importer = itemsAfterApply.find((item) => item.title === titles[1])!
    importer = await repository.updateWorkItem("matriz-infra-hub", importer.id, {
      acceptanceCriteria: importer.acceptanceCriteria.map((criterion) => ({ ...criterion, completed: true })),
      validationStatus: "passed",
    }, importer.revision)
    for (const productStatus of ["refined", "ready", "in_progress", "validation"] as const) {
      importer = await repository.updateWorkItem("matriz-infra-hub", importer.id, { productStatus }, importer.revision)
    }
    await rm(path.join(root, ".matriz", "agents"), { recursive: true, force: true })

    const completed = await completeMatrizProgramImporterItem(repository, plan)
    const activityAfterCompletion = await repository.listActivity("matriz-infra-hub", undefined, 500)
    const completedAgain = await completeMatrizProgramImporterItem(repository, plan)
    const verification = await verifyMatrizProgram(repository, plan)

    expect(completed.key).toBe("matriz-program-v1-02")
    expect(completed.item.productStatus).toBe("completed")
    expect(completed.item.validationStatus).toBe("passed")
    expect(completed.item.acceptanceCriteria.every((criterion) => criterion.completed)).toBe(true)
    expect(completedAgain.changed).toBe(false)
    expect(await repository.listActivity("matriz-infra-hub", undefined, 500)).toEqual(activityAfterCompletion)
    expect(verification).toMatchObject({
      valid: true,
      workItems: { total: 55, legacyV1: 5, generatedV2: 50, titleCollisions: 0 },
      roadmap: { phases: 5, initiatives: 5, backlogReferences: 50, referencesPerInitiative: [10, 10, 10, 10, 10] },
      score: { scorecards: 1, points: 1 },
      completedKeys: ["matriz-program-v1-02"],
      discoveryKeys: expect.any(Array),
    })
    expect(verification.discoveryKeys).toHaveLength(49)

    const afterCompletion = await matrixSnapshot(root)
    const activityBeforePostCompletionReplay = await repository.listActivity("matriz-infra-hub", undefined, 500)
    const appliedAfterCompletion = await materializeMatrizProgram(repository, plan, "apply")
    const resumedAfterCompletion = await materializeMatrizProgram(repository, plan, "resume")
    expect(appliedAfterCompletion.backlog).toMatchObject({ createdKeys: [], reusedKeys: expect.any(Array) })
    expect(appliedAfterCompletion.backlog.reusedKeys).toHaveLength(50)
    expect(appliedAfterCompletion.roadmap.changed).toBe(false)
    expect(resumedAfterCompletion.backlog).toMatchObject({ createdKeys: [], reusedKeys: expect.any(Array) })
    expect(resumedAfterCompletion.backlog.reusedKeys).toHaveLength(50)
    expect(resumedAfterCompletion.roadmap.changed).toBe(false)
    expect(await repository.listActivity("matriz-infra-hub", undefined, 500)).toEqual(activityBeforePostCompletionReplay)
    expect(await matrixSnapshot(root)).toEqual(afterCompletion)

    const third = itemsAfterApply.find((item) => item.title === titles[2])!
    await repository.updateWorkItem("matriz-infra-hub", third.id, { productStatus: "refined" }, third.revision)
    expect((await verifyMatrizProgram(repository, plan)).valid).toBe(false)
  }, 30_000)
})
