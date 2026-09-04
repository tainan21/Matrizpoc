import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter"

type Journey = Readonly<{ title: string; status: "passed" | "failed" | "skipped" }>

export default class EvidenceReporter implements Reporter {
  private readonly journeys: Journey[] = []

  onTestEnd(test: TestCase, result: TestResult): void {
    this.journeys.push({ title: test.title, status: result.status === "passed" ? "passed" : result.status === "skipped" ? "skipped" : "failed" })
  }

  onEnd(result: FullResult): void {
    const destination = process.env.MATRIZ_ACCEPTANCE_EVIDENCE_PATH
    if (!destination) return
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, JSON.stringify({ schemaVersion: "v1", status: result.status, journeys: this.journeys }, null, 2), "utf8")
  }
}
