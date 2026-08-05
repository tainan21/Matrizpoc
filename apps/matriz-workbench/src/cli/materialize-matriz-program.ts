import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { backlogBatchPlanSchema } from "../application/backlog-batch-importer"
import {
  completeMatrizProgramImporterItem,
  materializeMatrizProgram,
  verifyMatrizProgram,
} from "../application/matriz-program-materializer"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

const modes = ["dry-run", "apply", "resume", "verify", "complete-item-2"] as const
type MatrizProgramCliMode = typeof modes[number]

export function parseMatrizProgramCliMode(args: string[]): MatrizProgramCliMode {
  const modeIndex = args.indexOf("--mode")
  const mode = modeIndex >= 0 ? args[modeIndex + 1] : undefined
  if (!modes.includes(mode as MatrizProgramCliMode)) {
    throw new Error("Usage: materialize-matriz-program --mode dry-run|apply|resume|verify|complete-item-2")
  }
  return mode as MatrizProgramCliMode
}

async function loadPlan() {
  const source = await readFile(
    new URL("../application/plans/matriz-program-2026-08-05-v1.json", import.meta.url),
    "utf8",
  )
  return backlogBatchPlanSchema.parse(JSON.parse(source) as unknown)
}

async function main() {
  const mode = parseMatrizProgramCliMode(process.argv.slice(2))
  const plan = await loadPlan()
  const repository = await WorkspaceRepository.create()
  if (mode === "verify") {
    const verification = await verifyMatrizProgram(repository, plan)
    process.stdout.write(`${JSON.stringify({ mode, verification }, null, 2)}\n`)
    if (!verification.valid) process.exitCode = 1
    return
  }
  if (mode === "complete-item-2") {
    const completion = await completeMatrizProgramImporterItem(repository, plan)
    const verification = await verifyMatrizProgram(repository, plan)
    process.stdout.write(`${JSON.stringify({ mode, completion, verification }, null, 2)}\n`)
    if (!verification.valid) process.exitCode = 1
    return
  }
  const report = await materializeMatrizProgram(repository, plan, mode)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.backlog.failedKeys.length || report.backlog.skippedKeys.length) process.exitCode = 1
}

const entryPoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : ""

if (import.meta.url === entryPoint) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Matriz program materialization failed."}\n`)
    process.exitCode = 1
  })
}
