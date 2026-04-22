/**
 * check-readiness.ts
 *
 * Single, opinionated score of "how close to 100/100" the monorepo is against
 * the V1.1 architectural charter. Runs the canonical gates (typecheck, lint,
 * smoke, boundaries) and totals a weighted score.
 *
 * Usage:
 *   pnpm tsx tooling/scripts/check-readiness.ts
 */
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

interface Gate {
  name: string
  weight: number
  cmd: string
  args: string[]
}

const GATES: Gate[] = [
  { name: "typecheck", weight: 25, cmd: "pnpm", args: ["-r", "typecheck"] },
  { name: "lint", weight: 25, cmd: "pnpm", args: ["lint"] },
  { name: "smoke", weight: 30, cmd: "pnpm", args: ["test:smoke"] },
  { name: "boundaries", weight: 20, cmd: "pnpm", args: ["tsx", "tooling/scripts/verify-app-boundaries.ts"] },
]

function run(g: Gate, cwd: string): boolean {
  const res = spawnSync(g.cmd, g.args, { cwd, stdio: "inherit", shell: process.platform === "win32" })
  return res.status === 0
}

function main(): void {
  const root = resolve(__dirname, "..", "..")
  let score = 0
  const results: Array<{ gate: string; passed: boolean; weight: number }> = []

  for (const gate of GATES) {
    console.log(`\n[check-readiness] ▶ ${gate.name} (weight ${gate.weight})`)
    const passed = run(gate, root)
    if (passed) score += gate.weight
    results.push({ gate: gate.name, passed, weight: gate.weight })
  }

  console.log("\n[check-readiness] === summary ===")
  for (const r of results) {
    const mark = r.passed ? "PASS" : "FAIL"
    console.log(`  [${mark}] ${r.gate} (${r.weight})`)
  }
  const total = GATES.reduce((acc, g) => acc + g.weight, 0)
  console.log(`\n[check-readiness] score: ${score}/${total}`)

  if (score < total) process.exit(1)
}

main()
