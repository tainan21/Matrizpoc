import { readFile } from "node:fs/promises"
import path from "node:path"
import {
  importBacklogBatch,
  type BacklogBatchMode,
} from "../application/backlog-batch-importer"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const mode = argument("--mode") as BacklogBatchMode | undefined
  const planPath = argument("--plan")
  if (!mode || !["dry-run", "apply", "resume"].includes(mode) || !planPath) {
    throw new Error("Usage: import-backlog-batch --mode dry-run|apply|resume --plan <plan.json>")
  }
  const source = await readFile(path.resolve(process.cwd(), planPath), "utf8")
  const repository = await WorkspaceRepository.create()
  const report = await importBacklogBatch(repository, JSON.parse(source) as unknown, mode)
  console.log(JSON.stringify(report, null, 2))
  if (report.failedKeys.length) process.exitCode = 1
}

void main()
