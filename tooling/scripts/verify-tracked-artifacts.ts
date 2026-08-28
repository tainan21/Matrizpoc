/**
 * Prevent generated Matriz Control distributables from entering Git.
 *
 * `.gitignore` stops normal additions, while this guard fails CI if somebody
 * uses `git add --force` or otherwise stages the generated output.
 */
import { execFileSync } from "node:child_process"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..", "..")
const FORBIDDEN_PATHS = ["apps/matriz-control/dist/**"]

function trackedFiles(pathspec: string): string[] {
  return execFileSync("git", ["ls-files", "--", pathspec], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean)
}

const violations = FORBIDDEN_PATHS.flatMap(trackedFiles)

if (violations.length > 0) {
  console.error("[verify-tracked-artifacts] generated Matriz Control artifacts are tracked:")
  for (const path of violations) console.error(`  ${path}`)
  process.exit(1)
}

console.log("[verify-tracked-artifacts] no generated Matriz Control artifacts are tracked")
