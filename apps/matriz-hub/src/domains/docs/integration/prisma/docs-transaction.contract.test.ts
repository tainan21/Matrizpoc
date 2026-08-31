import { readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MatrizDocs transactional event contract", () => {
  it("routes every authoritative producer through the tenant transaction executor", async () => {
    const source = await readFile(path.resolve("src/domains/docs/integration/prisma/docs-repository.ts"), "utf8")
    for (const operation of [
      "createDocument", "importDocument", "updateDocumentDraft", "publishDocumentVersion",
      "createKnowledgeNode", "createKnowledgeEdge", "createSuggestion", "reviewSuggestion",
      "createContextPackage", "publishContextPackage", "recordMcpRead", "generateExport",
      "createTaskCandidate", "createGovernanceCandidate",
    ]) {
      expect(source).toMatch(new RegExp(`repository\\.${operation}\\(`))
    }
    expect(source).toContain("withTenantContext(this.db, actor.tenantId")
    expect(source).toContain("this.db.hubOutboxEvent.create")
  })

  it("forces tenant RLS while granting the worker only an operational policy", async () => {
    const migration = await readFile(path.resolve("../../prisma/hub/migrations/202608300002_docs_outbox/migration.sql"), "utf8")
    expect(migration).toContain("FORCE ROW LEVEL SECURITY")
    expect(migration).toContain('TO "matriz_hub_runtime"')
    expect(migration).toContain('TO "matriz_hub_worker"')
    expect(migration).not.toContain("BYPASSRLS")
  })
})
