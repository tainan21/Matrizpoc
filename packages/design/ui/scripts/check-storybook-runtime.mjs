import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"

const assetsDirectory = resolve(import.meta.dirname, "..", "storybook-static", "assets")

export function isJavaScriptModuleFile(fileName) {
  return fileName.endsWith(".js") || fileName.endsWith(".mjs")
}

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findJavaScriptFiles(path)
    return isJavaScriptModuleFile(entry.name) ? [path] : []
  }))
  return files.flat()
}

let files
try {
  files = await findJavaScriptFiles(assetsDirectory)
} catch (error) {
  throw new Error(
    `Storybook static assets are required before checking the JSX runtime: ${assetsDirectory}`,
    { cause: error },
  )
}

const offenders = []
for (const file of files) {
  const source = await readFile(file, "utf8")
  if (/(?:^|[^.$\w])React\.createElement\(/.test(source)) offenders.push(file)
}

if (offenders.length > 0) {
  throw new Error(
    `Storybook static output contains bare React.createElement calls: ${offenders.join(", ")}`,
  )
}
