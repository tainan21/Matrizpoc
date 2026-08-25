import { mkdir, open } from "node:fs/promises"
import path from "node:path"
import type { ScaffoldPlan } from "./plan"

export async function applyScaffoldPlan(
  repositoryRoot: string,
  plan: ScaffoldPlan,
): Promise<{ created: string[]; skipped: string[] }> {
  const conflicts = plan.operations.filter((operation) => operation.status === "conflict-existing")
  if (conflicts.length) {
    throw new Error(`Refusing to apply scaffold with conflicting files: ${conflicts.map((item) => item.path).join(", ")}`)
  }
  const created: string[] = []
  const skipped: string[] = []
  for (const operation of plan.operations) {
    if (operation.status === "skip-existing-identical") {
      skipped.push(operation.path)
      continue
    }
    const target = path.resolve(repositoryRoot, operation.path)
    const appsRoot = path.resolve(repositoryRoot, "apps")
    if (!target.startsWith(`${appsRoot}${path.sep}`)) throw new Error(`Unsafe scaffold target: ${operation.path}`)
    await mkdir(path.dirname(target), { recursive: true })
    const handle = await open(target, "wx")
    try {
      await handle.writeFile(operation.content, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    created.push(operation.path)
  }
  return { created, skipped }
}
