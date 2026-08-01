/**
 * smoke: cross-app boundary enforcement (L3/L4/L12)
 *
 * Scans apps/<app>/src and apps/<app>/app for forbidden imports. Reuses
 * tooling/scripts/verify-app-boundaries.ts semantics but runs inline so
 * it integrates with the regular smoke gate.
 */
import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const APPS = [
  "matriz-hub",
  "matriz-workbench",
  "sites",
  "spot",
  "seumei",
  "contracts",
  "willdash",
] as const
const ROOT = resolve(__dirname, "..", "..")

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

describe("cross-app boundaries", () => {
  for (const app of APPS) {
    it(`${app} does not import from another app's internals`, () => {
      const files = walk(join(ROOT, "apps", app))
      const others = APPS.filter((a) => a !== app)
      const violations: string[] = []
      for (const f of files) {
        const content = readFileSync(f, "utf8")
        for (const other of others) {
          if (content.includes(`apps/${other}/src/`)) violations.push(`${f} -> apps/${other}/src`)
          if (content.includes(`@matriz/app-${other}/src`)) violations.push(`${f} -> @matriz/app-${other}/src`)
        }
      }
      expect(violations).toEqual([])
    })
  }

  it("src/auth/** of every app does not import from src/domain/**", () => {
    const violations: string[] = []
    for (const app of APPS) {
      const authDir = join(ROOT, "apps", app, "src", "auth")
      let files: string[] = []
      try {
        files = walk(authDir)
      } catch {
        // auth folder optional for some legacy paths
      }
      for (const f of files) {
        const content = readFileSync(f, "utf8")
        if (/from ["'][^"']*\/domain\//.test(content)) violations.push(f)
      }
    }
    expect(violations).toEqual([])
  })
})
