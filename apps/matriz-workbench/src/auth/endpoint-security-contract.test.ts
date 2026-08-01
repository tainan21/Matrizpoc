import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const APP_ROOT = path.resolve(process.cwd(), "app")
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"])
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

async function routeFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) return routeFiles(target)
    return entry.isFile() && entry.name === "route.ts" ? [target] : []
  }))
  return nested.flat()
}

function exportedFunctions(source: string, fileName: string) {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  return file.statements.filter((statement): statement is ts.FunctionDeclaration => (
    ts.isFunctionDeclaration(statement)
    && Boolean(statement.name)
    && Boolean(statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ))
  ))
}

describe("endpoint security contract", () => {
  it("keeps every Route Handler behind the local API authorization boundary", async () => {
    const files = await routeFiles(path.join(APP_ROOT, "api"))
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const source = await readFile(file, "utf8")
      const functions = exportedFunctions(source, file)
        .filter((statement) => HTTP_METHODS.has(statement.name!.text))
      expect(functions.length, `${file} must export an HTTP method`).toBeGreaterThan(0)

      for (const handler of functions) {
        const method = handler.name!.text
        const body = handler.body?.getText() ?? ""
        expect(
          body,
          `${path.relative(APP_ROOT, file)} ${method} must authorize the request`,
        ).toContain("authorizeApiRequest(request")
        if (MUTATING_METHODS.has(method)) {
          expect(
            body,
            `${path.relative(APP_ROOT, file)} ${method} must enforce mutation origin checks`,
          ).toContain("authorizeApiRequest(request, true)")
        }
      }
    }
  })

  it("keeps every protected Server Action behind a session check", async () => {
    const file = path.join(APP_ROOT, "actions.ts")
    const source = await readFile(file, "utf8")
    const actions = exportedFunctions(source, file)

    expect(actions.map((action) => action.name!.text)).toContain("unlockAction")
    for (const action of actions) {
      if (action.name!.text === "unlockAction") continue
      expect(
        action.body?.getText() ?? "",
        `${action.name!.text} must revalidate the session server-side`,
      ).toContain("await requireWorkbenchSession()")
    }
  })
})
