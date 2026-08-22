import assert from "node:assert/strict"
import test from "node:test"

import { generateReport } from "./generate-report.mjs"

const results = Array.from({ length: 98 }, (_, index) => ({
  id: `CASE-${String(index + 1).padStart(3, "0")}`,
  status: "pass",
}))

test("report separates targets, redacts personal paths and prints verdict evidence", () => {
  const markdown = generateReport({
    generatedAt: "2026-08-20T12:00:00.000Z",
    baseline: {
      productVersion: "0.1.0",
      artifactSha256: "b".repeat(64),
      executablePath: "C:\\Users\\taina\\AppData\\Local\\Matriz Control\\matriz-control.exe",
    },
    packagedRuns: ["final-1", "final-2"].map((runId) => ({
      runId,
      results,
      installation: {
        installerSha256: "a".repeat(64),
        executablePath: "C:\\Users\\taina\\AppData\\Local\\Matriz Control\\matriz-control.exe",
      },
      lifecycle: { status: "pass", uninstalled: true },
      performance: { averageCpuPercent: 0.04, averageWorkingSetMb: 29, startupToObservedInteractiveMsUpperBound: 500 },
      visual: { results: [{ scrollWidth: 420, clientWidth: 420, unnamedControls: 0, focusVisible: true }] },
    })),
    findings: [{ severity: "minor", title: "Instalador ainda não assinado", status: "accepted" }],
  })

  assert.match(markdown, /Installed baseline/)
  assert.match(markdown, /Packaged candidate/)
  assert.doesNotMatch(markdown, /C:\\Users\\taina/)
  assert.match(markdown, /Verdict: Ready/)
  assert.match(markdown, /196\/196/)
})

test("report is not ready when either packaged cycle is incomplete", () => {
  const markdown = generateReport({
    generatedAt: "2026-08-20T12:00:00.000Z",
    baseline: undefined,
    packagedRuns: [{
      runId: "final-1",
      results,
      installation: { installerSha256: "a".repeat(64) },
      lifecycle: { status: "pass", uninstalled: true },
      performance: {},
      visual: { results: [] },
    }],
    findings: [],
  })

  assert.match(markdown, /Verdict: Not Ready/)
})
