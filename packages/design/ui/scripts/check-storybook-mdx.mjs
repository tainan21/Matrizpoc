import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { compile } from "@mdx-js/mdx"

export async function validateStorybookMdx(storiesDirectory) {
  const entries = await readdir(storiesDirectory, { withFileTypes: true })
  const mdxFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name)
    .sort()

  if (mdxFiles.length === 0) {
    throw new Error(`No Storybook MDX files found in ${storiesDirectory}`)
  }

  await Promise.all(
    mdxFiles.map(async (fileName) => {
      const filePath = join(storiesDirectory, fileName)
      await compile(
        { path: filePath, value: await readFile(filePath) },
        { format: "mdx", providerImportSource: "@mdx-js/react" },
      )
    }),
  )

  return mdxFiles
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] === currentFile) {
  const storiesDirectory = join(dirname(currentFile), "..", "stories")
  const files = await validateStorybookMdx(storiesDirectory)
  console.log(`Validated Storybook MDX: ${files.join(", ")}`)
}
