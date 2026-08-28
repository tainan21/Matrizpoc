import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "..", "..")

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8").replace(/\r\n/g, "\n")
}

function rootScripts(): Record<string, string> {
  const manifest = JSON.parse(read("package.json")) as { scripts: Record<string, string> }
  return manifest.scripts
}

describe("Linux CI validation matrix", () => {
  it("exposes reusable root commands for the complete validation contract", () => {
    const scripts = rootScripts()

    expect(scripts["prisma:generate"]).toContain("pnpm prisma:generate:spot")
    expect(scripts["prisma:generate"]).toContain("pnpm prisma:generate:willdash")
    expect(scripts["test:apps"]).toBe("pnpm -r --workspace-concurrency=1 --if-present run test")
    expect(scripts["next:typegen"]).toBe('pnpm --filter "./apps/*" exec next typegen')
    expect(scripts["verify:boundaries"]).toBe("tsx tooling/scripts/verify-app-boundaries.ts")
    expect(scripts["verify:tracked-artifacts"]).toBe("tsx tooling/scripts/verify-tracked-artifacts.ts")
    expect(scripts["build:affected"]).toBe("turbo run build --affected --concurrency=4")
    expect(scripts["check:clean"]).toBe("git diff --exit-code && git diff --cached --exit-code")

    const workbench = JSON.parse(read("apps/matriz-workbench/package.json")) as {
      scripts: Record<string, string>
    }
    expect(workbench.scripts.test).toBe("vitest run --config vitest.config.ts --no-file-parallelism")
  })

  it("treats Next environment declarations as generated files", () => {
    expect(read(".gitignore")).toContain("apps/*/next-env.d.ts")

    const tracked = execFileSync("git", ["ls-files", "apps/*/next-env.d.ts"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim()
    expect(tracked).toBe("")

    for (const app of ["contracts", "matriz-admin", "matriz-control", "matriz-hub", "matriz-workbench", "matrizlib", "seumeiapp", "sites", "spot", "willdash"]) {
      expect(read(`apps/${app}/tsconfig.json`)).toContain('"next-env.d.ts"')
    }
  })

  it("keeps primary, deploy, and Workbench Linux gates aligned", () => {
    const ci = read(".github/workflows/ci.yml")
    const deploy = read(".github/workflows/deploy-apps.yml")
    const workbench = read(".github/workflows/matriz-workbench.yml")
    const rootCommands = [
      "pnpm audit:prod",
      "pnpm prisma:validate",
      "pnpm prisma:generate",
      "pnpm test:apps",
      "pnpm typecheck",
      "pnpm lint",
      "pnpm test:smoke",
      "pnpm verify:boundaries",
      "pnpm verify:tracked-artifacts",
      "pnpm build",
      "pnpm check:clean",
    ]

    expect(ci).toContain("permissions:\n  contents: read")
    expect(ci).toContain("cancel-in-progress: true")
    expect(ci).toContain("timeout-minutes: 30")
    expect(ci).toContain("fetch-depth: 0")
    expect(ci).toContain("version: 9.12.0")
    expect(ci).toContain('node-version: "22"')
    expect(ci).toContain("pnpm install --frozen-lockfile")
    expect(ci).toContain("CORE_DATABASE_URL: postgresql://prisma:prisma@127.0.0.1:5432/matriz?schema=core")
    expect(ci).toContain("OPS_DATABASE_URL: postgresql://prisma:prisma@127.0.0.1:5432/matriz?schema=ops")
    expect(ci).toContain("PAY_DATABASE_URL: postgresql://prisma:prisma@127.0.0.1:5432/matriz?schema=pay")
    expect(ci).toContain("pnpm next:typegen")
    expect(ci).toContain("pnpm build:affected")
    expect(ci).toContain("git branch --force main origin/main")
    expect(ci).toContain("SITES_CANONICAL_ORIGINS: https://sites.example.invalid")
    for (const command of rootCommands) expect(ci).toContain(command)

    for (const command of rootCommands) expect(deploy).toContain(command)
    expect(deploy).toContain("pnpm next:typegen")
    expect(deploy).toContain("CORE_DATABASE_URL: postgresql://prisma:prisma@127.0.0.1:5432/matriz?schema=core")
    expect(deploy).toContain("OPS_DATABASE_URL: postgresql://prisma:prisma@127.0.0.1:5432/matriz?schema=ops")
    expect(deploy).toContain("PAY_DATABASE_URL: postgresql://prisma:prisma@127.0.0.1:5432/matriz?schema=pay")
    expect(deploy).toContain("version: 9.12.0")
    expect(deploy).toContain('node-version: "22"')

    expect(workbench).toContain("pnpm --filter @matriz/app-matriz-workbench exec next typegen")
    expect(workbench).toContain("pnpm prisma:generate")
    expect(workbench).toContain("PAY_DATABASE_URL: postgresql://prisma:prisma@127.0.0.1:5432/matriz?schema=pay")
    expect(workbench).toContain("pnpm check:clean")
  })
})
