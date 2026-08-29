import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "..", "..")
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])

type Surface = { id: string; path: string; line: number; name: string }
function trackedAppFiles(): string[] {
  return execFileSync("git", ["ls-files", "apps"], { cwd: ROOT, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean)
}

function source(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8")
}

function routePath(app: string, path: string): string {
  const suffix = path.replace(`apps/${app}/app/`, "").replace(/\/route\.ts$/, "")
  return `/${suffix}`
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function isExported(node: ts.Node): boolean {
  return !!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
}

function isAsyncFunctionLike(node: ts.Node | undefined): boolean {
  return !!node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    !!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)
}

function isFunctionLike(node: ts.Node | undefined): boolean {
  return !!node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node))
}

function resolvesToCallableBinding(sourceFile: ts.SourceFile, name: string, visited = new Set<string>()): boolean {
  if (visited.has(name)) return false
  visited.add(name)
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return true
    if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find((candidate) =>
        ts.isIdentifier(candidate.name) && candidate.name.text === name,
      )
      if (declaration) {
        if (isFunctionLike(declaration.initializer)) return true
        return ts.isIdentifier(declaration.initializer) && resolvesToCallableBinding(sourceFile, declaration.initializer.text, visited)
      }
    }
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause
      if (clause?.name?.text === name) return true
      const bindings = clause?.namedBindings
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.some((element) => element.name.text === name)) return true
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      if (statement.exportClause.elements.some((element) => element.name.text === name)) return true
    }
  }
  return false
}

function isRequestHandlerInitializer(sourceFile: ts.SourceFile, node: ts.Expression | undefined): boolean {
  return !!node && (isFunctionLike(node) || (ts.isIdentifier(node) && resolvesToCallableBinding(sourceFile, node.text)))
}

function hasUseServerDirective(sourceFile: ts.SourceFile): boolean {
  return sourceFile.statements.some((statement) =>
    ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === "use server",
  )
}

function parse(path: string, content: string): ts.SourceFile {
  const sourceFile = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true)
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error(`Cannot safely inventory ${path}: ${sourceFile.parseDiagnostics[0].messageText}`)
  }
  return sourceFile
}

function collectModuleExports(path: string, content: string): Surface[] {
  const sourceFile = parse(path, content)
  const app = path.split("/")[1] ?? "fixture"
  const route = /\/app\/.+\/route\.ts$/.test(path)
  const action = /\/app\/.*\.tsx?$/.test(path) && hasUseServerDirective(sourceFile)
  if (!route && !action) return []

  const surfaces: Surface[] = []
  const add = (name: string, node: ts.Node) => {
    if (route && !HTTP_METHODS.has(name)) return
    const id = route
      ? `HTTP:${app}:${name}:${routePath(app, path)}`
      : `ACTION:${app}:${name}`
    surfaces.push({ id, path, line: lineOf(sourceFile, node), name })
  }

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
      if (route || (action && !!statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword))) {
        add(statement.name.text, statement)
      }
      continue
    }
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && (
          (route && isRequestHandlerInitializer(sourceFile, declaration.initializer)) ||
          (action && isAsyncFunctionLike(declaration.initializer))
        )) {
          add(declaration.name.text, declaration)
        } else if (route && ts.isIdentifier(declaration.name) && HTTP_METHODS.has(declaration.name.text)) {
          throw new Error(`Cannot safely inventory ${path}: ${declaration.name.text} is not bound to a callable request handler`)
        }
      }
      continue
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) add(element.name.text, element)
    }
  }
  return surfaces
}

function collectRequestSurfaces(): Surface[] {
  const files = trackedAppFiles()
  const surfaces = files
    .filter((path) => /\/app\/.*\.tsx?$/.test(path))
    .flatMap((path) => collectModuleExports(path, source(path)))

  for (const path of [
    "apps/matriz-workbench/src/mcp/server.ts",
    "apps/matriz-hub/src/mcp/tools.ts",
    "apps/matriz-hub/src/domains/docs/mcp/tools.ts",
  ]) {
    const sourceFile = parse(path, source(path))
    const app = path.split("/")[1]
    const visit = (node: ts.Node) => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "name" && ts.isStringLiteral(node.initializer)) {
        const name = node.initializer.text
        if (/^[a-z][a-z0-9_]+$/.test(name)) {
          surfaces.push({ id: `MCP:${app}:${name}`, path, line: lineOf(sourceFile, node), name })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }
  return surfaces.sort((left, right) => left.id.localeCompare(right.id))
}

function documentedSurfaces(markdown = source("docs/security/ENDPOINT-INVENTORY.md")): Surface[] {
  const sections = [
    { title: "HTTP Route Handlers", type: "HTTP" },
    { title: "Workbench Server Actions", type: "ACTION" },
    { title: "MCP tools", type: "MCP" },
  ] as const
  const lines = markdown.split(/\r?\n/)
  const surfaces: Surface[] = []
  const rowPattern = /^\| `(HTTP|ACTION|MCP):([^`]+)` \| `([^`:\s]+(?:\/[^`:\s]+)*):([1-9]\d*)` \| `([^`]+)` \| ([RM]) \| `([^`]+)` \|$/

  let cursor = lines.findIndex((line) => /^## HTTP Route Handlers — \d+ entries$/.test(line))
  if (cursor < 0) throw new Error("Expected inventory heading: HTTP Route Handlers")
  for (const section of sections) {
    const heading = lines[cursor]?.match(/^## (HTTP Route Handlers|Workbench Server Actions|MCP tools) — (\d+) entries$/)
    if (!heading || heading[1] !== section.title) throw new Error(`Expected inventory heading: ${section.title}`)
    const countText = heading[2]
    cursor += 1
    if (lines[cursor] !== "") throw new Error(`Expected blank line after ${section.title}`)
    cursor += 1
    if (lines[cursor] !== "| ID | Source | Function/tool | Effect | Profile |" || lines[cursor + 1] !== "| --- | --- | --- | --- | --- |") {
      throw new Error(`Malformed inventory table header: ${section.title}`)
    }
    cursor += 2
    let count = 0
    while (cursor < lines.length && lines[cursor].startsWith("|")) {
      const match = lines[cursor].match(rowPattern)
      if (!match) throw new Error(`Malformed inventory row in ${section.title}: ${lines[cursor]}`)
      const [, type, suffix, path, lineNumber, name] = match
      if (type !== section.type) throw new Error(`Unexpected inventory ID type in ${section.title}: ${type}`)
      surfaces.push({ id: `${type}:${suffix}`, path, line: Number(lineNumber), name })
      count += 1
      cursor += 1
    }
    if (count !== Number(countText)) throw new Error(`Inventory count mismatch in ${section.title}: expected ${countText}, found ${count}`)
    while (cursor < lines.length && lines[cursor] === "") {
      cursor += 1
    }
    if (section.title !== "MCP tools" && !lines[cursor]?.startsWith("## ")) throw new Error(`Unexpected inventory content after ${section.title}: ${lines[cursor]}`)
  }
  if (lines[cursor] !== "## Counts and zero-endpoint apps") throw new Error(`Expected summary heading: ${lines[cursor]}`)
<<<<<<< HEAD
=======
  const summaryLines = [
    /^Current tracked-source count: \*\*(\d+)\*\* = (\d+) HTTP methods \((\d+) Hub, (\d+) Workbench, (\d+) product apps\),$/,
    /^(\d+) Workbench Server Actions, and (\d+) MCP tools \((\d+) Hub\/MatrizDocs, (\d+) Workbench\)\.$/,
    /^HTTP mutations: (\d+); HTTP reads\/preflight: (\d+)\. The AST inventory adds five$/,
    /^mock-auth `OPTIONS` aliases that a declaration-only scan missed\.$/,
    /^`sites` has \*\*zero request$/,
    /^handlers, exported Server Actions, and declared MCP tools\*\* in tracked app$/,
    /^source\. Their page-level mock\/domain operations are intentionally not counted$/,
    /^as request-facing endpoints\.$/,
  ]
>>>>>>> 73482d5 (checkpoint: preserve Wave 1 OIDC foundation worktree)
  cursor += 1
  if (lines[cursor] === "") cursor += 1
  if (!/^Current tracked-source count: \*\*(\d+)\*\* = (\d+) HTTP methods, (\d+) Server Actions, and (\d+) MCP tools\.$/.test(lines[cursor] ?? "")) {
    throw new Error(`Unexpected summary content: ${lines[cursor]}`)
  }
  cursor += 1
  while (cursor < lines.length) {
    if (lines[cursor] !== "") throw new Error(`Unexpected summary content: ${lines[cursor]}`)
    cursor += 1
  }
  const duplicates = surfaces.filter((surface, index) => surfaces.findIndex((other) => other.id === surface.id) !== index)
  if (duplicates.length > 0) throw new Error(`Duplicate inventory ID: ${duplicates[0].id}`)
  return surfaces.sort((left, right) => left.id.localeCompare(right.id))
}

function updateInventory(expected: readonly Surface[]) {
  const inventoryPath = resolve(ROOT, "docs/security/ENDPOINT-INVENTORY.md")
  const previous = readFileSync(inventoryPath, "utf8")
  const preamble = previous.slice(0, previous.indexOf("## HTTP Route Handlers"))
  const priorRows = new Map<string, { effect: string; profile: string }>()
  for (const line of previous.split(/\r?\n/)) {
    const match = line.match(/^\| `([^`]+)` \| `[^`]+` \| `[^`]+` \| ([RM]) \| `([^`]+)` \|$/)
    if (match) priorRows.set(match[1], { effect: match[2], profile: match[3] })
  }
  const classify = (surface: Surface) => {
    const prior = priorRows.get(surface.id)
    if (prior) return prior
    if (surface.id.startsWith("ACTION:")) return { effect: "M", profile: "WB-A" }
    if (surface.id.startsWith("MCP:matriz-workbench:")) {
      const read = /:(workbench_(get|list|read|check)_)/.test(surface.id)
      return { effect: read ? "R" : "M", profile: read ? "WB-MCP-R" : "WB-MCP-M" }
    }
    if (surface.id.startsWith("MCP:")) return { effect: "R", profile: "H-MCP-R" }
    const read = /:(GET|HEAD|OPTIONS):/.test(surface.id)
    return { effect: read ? "R" : "M", profile: read ? "APP-R" : "APP-M" }
  }
  const sections = [
    { title: "HTTP Route Handlers", items: expected.filter((item) => item.id.startsWith("HTTP:")) },
    { title: "Workbench Server Actions", items: expected.filter((item) => item.id.startsWith("ACTION:")) },
    { title: "MCP tools", items: expected.filter((item) => item.id.startsWith("MCP:")) },
  ]
  const body = sections.map(({ title, items }) => [
    `## ${title} — ${items.length} entries`,
    "",
    "| ID | Source | Function/tool | Effect | Profile |",
    "| --- | --- | --- | --- | --- |",
    ...items.map((item) => {
      const classification = classify(item)
      return `| \`${item.id}\` | \`${item.path}:${item.line}\` | \`${item.name}\` | ${classification.effect} | \`${classification.profile}\` |`
    }),
    "",
  ].join("\n")).join("\n")
  const [http, actions, mcp] = sections.map((section) => section.items.length)
  writeFileSync(inventoryPath, `${preamble}${body}\n## Counts and zero-endpoint apps\n\nCurrent tracked-source count: **${expected.length}** = ${http} HTTP methods, ${actions} Server Actions, and ${mcp} MCP tools.\n`)
}

describe("security endpoint inventory drift", () => {
  it("extracts function, const, and named re-export request forms while excluding arbitrary exports", () => {
    expect(collectModuleExports(
      "apps/fixture/app/api/example/route.ts",
      source("tests/fixtures/security-inventory/route-export-forms.ts"),
    ).map((surface) => surface.id)).toEqual([
      "HTTP:fixture:GET:/api/example",
      "HTTP:fixture:POST:/api/example",
      "HTTP:fixture:PUT:/api/example",
    ])
    expect(collectModuleExports(
      "apps/fixture/app/actions.ts",
      source("tests/fixtures/security-inventory/action-export-forms.ts"),
    ).map((surface) => surface.id)).toEqual([
      "ACTION:fixture:saveAction",
      "ACTION:fixture:createAction",
      "ACTION:fixture:finishAction",
    ])
    expect(collectModuleExports(
      "apps/fixture/src/arbitrary.ts",
      source("tests/fixtures/security-inventory/non-request-exports.ts"),
    )).toEqual([])
    expect(() => collectModuleExports(
      "apps/fixture/app/api/non-handler/route.ts",
      source("tests/fixtures/security-inventory/route-identifier-non-handler.ts"),
    )).toThrow("Cannot safely inventory")
    expect(() => collectModuleExports("apps/fixture/app/api/broken/route.ts", "export const GET = (")).toThrow("Cannot safely inventory")
  })

  it("fails closed when an inventory table contains injected or malformed rows", () => {
    expect(() => documentedSurfaces(source("tests/fixtures/security-inventory/injected-inventory.md"))).toThrow("Malformed inventory row")
  })

  it("fails closed when a row follows a blank line before the next inventory heading", () => {
    expect(() => documentedSurfaces(source("tests/fixtures/security-inventory/inventory-row-after-blank.md"))).toThrow("Unexpected inventory content")
  })

  it("fails closed when a row follows the counts summary", () => {
    expect(() => documentedSurfaces(source("tests/fixtures/security-inventory/inventory-row-after-summary.md"))).toThrow("Unexpected summary content")
  })

  it("covers every tracked route handler, Server Action, and declared MCP tool exactly once with the documented source anchor", () => {
    const expected = collectRequestSurfaces()
    if (process.env.UPDATE_ENDPOINT_INVENTORY === "1") updateInventory(expected)
    const documented = documentedSurfaces()
    const duplicates = documented.filter((surface, index) => documented.findIndex((other) => other.id === surface.id) !== index)

    expect(duplicates).toEqual([])
    expect(documented).toEqual(expected)
  })
})
