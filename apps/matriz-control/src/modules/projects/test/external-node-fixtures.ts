import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export async function createExternalNodeFixture(options: { manager: "npm" | "pnpm" | "bun"; name?: string; script?: string }) {
  const root = await mkdtemp(join(tmpdir(), "matriz-external-project-"))
  await mkdir(join(root, "src"))
  await writeFile(join(root, "package.json"), JSON.stringify({ name: options.name ?? "external-demo", scripts: { dev: options.script ?? "node server.js" } }))
  const lock = options.manager === "npm" ? "package-lock.json" : options.manager === "pnpm" ? "pnpm-lock.yaml" : "bun.lock"
  await writeFile(join(root, lock), options.manager === "npm" ? "{}" : "fixture")
  await writeFile(join(root, "src", "ignored-secret.env"), "TOKEN=synthetic-secret")
  return root
}
