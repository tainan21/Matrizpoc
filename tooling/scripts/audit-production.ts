import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"

type AuditCounts = {
  critical?: unknown
  high?: unknown
  moderate?: unknown
  low?: unknown
}

type ProductionAudit = {
  metadata?: {
    vulnerabilities?: AuditCounts
  }
}

function readInputPath(): string | undefined {
  const index = process.argv.indexOf("--input")
  return index >= 0 ? process.argv[index + 1] : undefined
}

function readAudit(): ProductionAudit {
  const input = readInputPath()
  if (input) return JSON.parse(readFileSync(input, "utf8")) as ProductionAudit

  const pnpm = process.platform === "win32" ? "pnpm.exe" : "pnpm"
  const audit = spawnSync(pnpm, ["audit", "--prod", "--json"], {
    encoding: "utf8",
  })
  if (audit.error) throw audit.error
  return JSON.parse(audit.stdout) as ProductionAudit
}

function count(counts: AuditCounts | undefined, field: keyof AuditCounts): number {
  const value = counts?.[field]
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`invalid production audit payload: ${field} must be a non-negative integer`)
  }
  return value
}

const vulnerabilities = readAudit().metadata?.vulnerabilities
const critical = count(vulnerabilities, "critical")
const high = count(vulnerabilities, "high")
const moderate = count(vulnerabilities, "moderate")
const low = count(vulnerabilities, "low")

console.log(`production audit: critical=${critical} high=${high} moderate=${moderate} low=${low}`)

if (critical > 0 || high > 0) {
  console.error("audit gate failed: high or critical production advisories remain")
  process.exitCode = 1
}
