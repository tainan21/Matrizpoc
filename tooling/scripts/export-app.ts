/**
 * export-app.ts
 *
 * Produces a self-contained snapshot of a single app, ready to be pushed into
 * its own repository. Rewrites `workspace:*` / `workspace:^` references in
 * `package.json` to real versions so the extracted repo can `pnpm install`
 * against the registry.
 *
 * Assumptions:
 *   - Shared packages (@matriz/*) will be published under the same scope.
 *   - The destination repo still consumes them as dependencies (no code copy).
 *   - Env vars, vercel.json, prisma schema and src tree are copied as-is.
 *
 * Usage:
 *   pnpm tsx tooling/scripts/export-app.ts spot dist/export/spot
 *   pnpm tsx tooling/scripts/export-app.ts matriz-hub /tmp/hub-split
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const APPS = ["matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"] as const
type AppId = (typeof APPS)[number]

const PUBLISHED_VERSION = "1.1.0"

function fail(msg: string): never {
  console.error(`[export-app] ${msg}`)
  process.exit(1)
}

function rewriteWorkspaceDeps(pkg: Record<string, unknown>): Record<string, unknown> {
  const rewrite = (block?: Record<string, string>): Record<string, string> | undefined => {
    if (!block) return block
    const out: Record<string, string> = {}
    for (const [name, version] of Object.entries(block)) {
      out[name] = version.startsWith("workspace:") ? `^${PUBLISHED_VERSION}` : version
    }
    return out
  }
  return {
    ...pkg,
    dependencies: rewrite(pkg.dependencies as Record<string, string> | undefined),
    devDependencies: rewrite(pkg.devDependencies as Record<string, string> | undefined),
    peerDependencies: rewrite(pkg.peerDependencies as Record<string, string> | undefined),
  }
}

function main(): void {
  const [, , rawApp, rawOut] = process.argv
  if (!rawApp || !rawOut) fail("usage: export-app.ts <app> <out-dir>")
  if (!APPS.includes(rawApp as AppId)) fail(`unknown app "${rawApp}"`)

  const root = resolve(__dirname, "..", "..")
  const src = resolve(root, "apps", rawApp)
  const dst = resolve(rawOut)

  if (!existsSync(src)) fail(`app dir not found: ${src}`)
  if (existsSync(dst)) fail(`destination already exists: ${dst}`)

  mkdirSync(dst, { recursive: true })
  cpSync(src, dst, {
    recursive: true,
    filter: (p) => !p.includes("node_modules") && !p.includes(".next") && !p.includes(".turbo"),
  })

  const pkgPath = resolve(dst, "package.json")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>
  const rewritten = rewriteWorkspaceDeps(pkg)
  writeFileSync(pkgPath, JSON.stringify(rewritten, null, 2) + "\n")

  // Drop a README breadcrumb so the new repo is self-explanatory
  const readme = `# ${pkg.name as string}

Exported from the Matriz monorepo on ${new Date().toISOString()}.

Shared packages (@matriz/*) are consumed from the published registry.
See \`docs/app-extraction-model.md\` in the monorepo for the full procedure.
`
  mkdirSync(dirname(resolve(dst, "README.md")), { recursive: true })
  writeFileSync(resolve(dst, "README.md"), readme)

  console.log(`[export-app] exported ${rawApp} -> ${dst}`)
}

main()
