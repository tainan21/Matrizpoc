/**
 * verify-app-boundaries.ts
 *
 * Static, zero-dependency check that a single app (or all apps) respects the
 * cross-app boundary rules (L3/L4/L12):
 *   - no `apps/<Y>/src/**` imports from any other app
 *   - no `apps/<Y>/app/**` imports
 *   - no reach into `src/domain/**` from `src/auth/**` or from presentation
 *   - no presentation importing raw domain models
 *
 * This lives alongside ESLint `no-restricted-imports` as a belt-and-suspenders
 * check that also runs in extracted-repo scenarios where ESLint config might
 * have been stripped.
 *
 * Usage:
 *   pnpm tsx tooling/scripts/verify-app-boundaries.ts            # all apps
 *   pnpm tsx tooling/scripts/verify-app-boundaries.ts matriz-hub # one app
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"

const APPS = [
  "matriz-hub",
  "matriz-desktop",
  "matriz-workbench",
  "sites",
  "spot",
  "seumei",
  "contracts",
  "willdash",
] as const
type AppId = (typeof APPS)[number]

interface Violation {
  file: string
  line: number
  rule: string
  match: string
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (
      entry === "node_modules"
      || entry === ".next"
      || entry === ".turbo"
      || entry === ".runtime"
      || entry === ".matriz"
    ) continue
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p)
  }
  return out
}

function checkApp(root: string, app: AppId): Violation[] {
  const appDir = join(root, "apps", app)
  const files = walk(appDir)
  const violations: Violation[] = []
  const otherApps = APPS.filter((a) => a !== app)

  for (const file of files) {
    const normalizedFile = file.replaceAll("\\", "/")
    const content = readFileSync(file, "utf8")
    const lines = content.split("\n")
    lines.forEach((line, idx) => {
      // Rule L3/L4: never import another app's internals
      for (const other of otherApps) {
        const patterns = [
          new RegExp(`from ["']\\.\\.?/.*apps/${other}/src/.*["']`),
          new RegExp(`from ["']@matriz/app-${other}/src`),
          new RegExp(`from ["']\\.\\.?/.*apps/${other}/app/.*["']`),
        ]
        for (const re of patterns) {
          const m = line.match(re)
          if (m) violations.push({ file: relative(root, file), line: idx + 1, rule: "L3/L4", match: m[0] })
        }
      }
      // Rule L12: auth layer must not pull domain internals
      if (normalizedFile.includes(`/src/auth/`) && /from ["'][^"']*\/domain\//.test(line)) {
        const m = line.match(/from ["'][^"']*\/domain\/[^"']*["']/)
        if (m) violations.push({ file: relative(root, file), line: idx + 1, rule: "L12", match: m[0] })
      }
      // Rule L6: presentation must not import raw domain models
      if (/\/presentation\//.test(normalizedFile) && /from ["'][^"']*\/domain\/(?!index)/.test(line)) {
        const m = line.match(/from ["'][^"']*\/domain\/[^"']*["']/)
        if (m && !m[0].includes("/domain/index")) {
          violations.push({ file: relative(root, file), line: idx + 1, rule: "L6", match: m[0] })
        }
      }
    })
  }
  return violations
}

function main(): void {
  const root = resolve(__dirname, "..", "..")
  const targetArg = process.argv[2]
  const targets: AppId[] = targetArg
    ? APPS.includes(targetArg as AppId)
      ? [targetArg as AppId]
      : (() => {
          console.error(`[verify-app-boundaries] unknown app "${targetArg}"`)
          process.exit(1)
        })()
    : [...APPS]

  let total = 0
  for (const app of targets) {
    const v = checkApp(root, app)
    if (v.length === 0) {
      console.log(`[verify-app-boundaries] ${app}: OK`)
    } else {
      console.log(`[verify-app-boundaries] ${app}: ${v.length} violation(s)`)
      for (const it of v) {
        console.log(`  ${it.file}:${it.line} [${it.rule}] ${it.match}`)
      }
      total += v.length
    }
  }

  if (total > 0) {
    console.error(`[verify-app-boundaries] FAILED: ${total} violation(s)`)
    process.exit(1)
  }
  console.log("[verify-app-boundaries] all apps pass")
}

main()
