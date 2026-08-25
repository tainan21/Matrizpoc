import { spawnSync } from "node:child_process"
import type { ProcessInvocation } from "./dev"
import { resolveExecutableInvocation } from "./dev"

export function buildCheckInvocations(
  appId: string,
  packageName: string,
  repositoryRoot: string,
): readonly ProcessInvocation[] {
  return [
    { command: "pnpm", args: ["--filter", packageName, "lint"], cwd: repositoryRoot },
    { command: "pnpm", args: ["--filter", packageName, "typecheck"], cwd: repositoryRoot },
    { command: "pnpm", args: ["exec", "tsx", "tooling/scripts/verify-app-boundaries.ts", appId], cwd: repositoryRoot },
  ]
}

export function runAppChecks(appId: string, packageName: string, repositoryRoot: string): void {
  for (const base of buildCheckInvocations(appId, packageName, repositoryRoot)) {
    const invocation = resolveExecutableInvocation(
      base,
      process.platform,
      process.env.npm_execpath,
      process.execPath,
    )
    const result = spawnSync(invocation.command, [...invocation.args], {
      cwd: invocation.cwd,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`Check failed with exit code ${result.status}: ${base.args.join(" ")}`)
  }
}
