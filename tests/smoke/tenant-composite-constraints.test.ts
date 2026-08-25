import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const schemaNames = ["core", "hub", "spot", "seumei", "contracts", "willdash"] as const
const expectedRelationCounts: Record<(typeof schemaNames)[number], number> = {
  core: 1,
  hub: 29,
  spot: 3,
  seumei: 19,
  contracts: 4,
  willdash: 2,
}

type Model = { name: string; table: string; body: string }
type CompositeRelation = { child: Model; field: string; parentName: string }

function loadSchema(name: string) {
  return readFileSync(join(root, "prisma", name, "schema.prisma"), "utf8")
}

function parseModels(source: string): Model[] {
  return [...source.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)].map((match) => ({
    name: match[1],
    body: match[2],
    table: match[2].match(/@@map\("([^"]+)"\)/)?.[1] ?? match[1],
  }))
}

function compositeRelations(models: Model[]): CompositeRelation[] {
  return models.flatMap((child) =>
    [...child.body.matchAll(/^\s+\w+\s+(\w+)\??\s+@relation\([^\r\n]*fields: \[tenantId,\s*(\w+)\], references: \[tenantId, id\]/gm)]
      .map((match) => ({ child, parentName: match[1], field: match[2] })),
  )
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function migrationHistory(name: string) {
  const directory = join(root, "prisma", name, "migrations")
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readFileSync(join(directory, entry.name, "migration.sql"), "utf8"))
    .join("\n")
}

describe("tenant composite constraints", () => {
  it.each(schemaNames)("covers every composite relation in %s", (name) => {
    const models = parseModels(loadSchema(name))
    const relations = compositeRelations(models)
    const history = migrationHistory(name)

    expect(relations).toHaveLength(expectedRelationCounts[name])

    for (const relation of relations) {
      const parent = models.find((model) => model.name === relation.parentName)
      expect(parent, `${name}.${relation.child.name}.${relation.field}: parent model`).toBeDefined()
      expect(parent?.body, `${name}.${relation.parentName}: composite candidate key`).toContain(
        "@@unique([tenantId, id])",
      )

      const supportingIndex = new RegExp(
        `@@(index|unique)\\(\\[(tenantId,\\s*${escapeRegex(relation.field)}(?:,\\s*\\w+)*)\\]`,
      )
      const indexMatch = relation.child.body.match(supportingIndex)
      expect(indexMatch, `${name}.${relation.child.name}.${relation.field}: tenant-first supporting index`).not.toBeNull()
      const indexFields = indexMatch![2].replace(/\s+/g, "").split(",")
      const indexSuffix = indexMatch![1] === "unique" ? "key" : "idx"
      const indexName = `${relation.child.table}_${indexFields.join("_")}_${indexSuffix}`
      expect(history, `${name}.${relation.child.name}.${relation.field}: migration index ${indexName}`).toContain(
        `INDEX "${indexName}"`,
      )

      const constraint = `${relation.child.table}_tenantId_${relation.field}_fkey`
      const migrationForeignKey = new RegExp(
        `ADD CONSTRAINT "${escapeRegex(constraint)}" FOREIGN KEY \\("tenantId", "${escapeRegex(relation.field)}"\\) REFERENCES "${escapeRegex(parent!.table)}"\\("tenantId", "id"\\)`,
      )
      expect(
        history,
        `${name}.${relation.child.name}.${relation.field}: migration composite FK ${constraint}`,
      ).toMatch(migrationForeignKey)
    }
  })
})
