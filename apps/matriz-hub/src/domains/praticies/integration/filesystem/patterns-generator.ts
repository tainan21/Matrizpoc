import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises"
import { randomUUID } from "node:crypto"
import path from "node:path"
import type { PatternsGenerator } from "../../domain/repositories/patterns-generator"
import type { PatternArtifact, PatternGeneration } from "../../domain/types"

type DirectoryNode = {
  id: number
  path: string
  parentId: number | null
  name: string
  depth: number
  kind: string
  tags: string[]
  childDirectoryCount: number
  descendantDirectoryCount: number
}

type Boundary = {
  name: string
  path: string
  descendantDirectoryCount: number
  directAreas: string[]
}

type LlmFolderMap = {
  format: "project-folder-map/v1"
  generatedAt: string
  root: "."
  scope: string
  summary: {
    mappedDirectoryCount: number
    topLevelDirectoryCount: number
    skippedSymlinkCount: number
    inaccessibleDirectoryCount: number
  }
  exclusionPolicy: Array<{ name: string; reason: string }>
  inaccessible: Array<{ path: string; reason: string }>
  boundaryMap: {
    applications: Boundary[]
    packageGroups: Boundary[]
  }
  layerSummary: Array<{ tag: string; directories: number }>
  directories: DirectoryNode[]
}

const OUTPUT_DIRECTORY = ".patterns"
const HUMAN_FILENAME = "folders.human.md"
const LLM_FILENAME = "folders.llm.json"

const excludedDirectories = new Map([
  [".git", "Git metadata"],
  [".next", "Next.js build output"],
  [".patterns", "Mapper output (prevents self-inclusion)"],
  [".playwright-cli", "browser automation state"],
  [".pnpm-store", "pnpm package cache"],
  [".runtime", "local runtime state"],
  [".snapshots", "local snapshots"],
  [".superpowers", "local tool state"],
  [".turbo", "Turborepo cache"],
  [".vercel", "Vercel local state"],
  [".worktrees", "separate Git worktrees"],
  ["node_modules", "installed dependencies"],
  ["coverage", "test coverage output"],
  ["playwright-report", "Playwright report output"],
  ["test-results", "test runner output"],
])

const topLevelKinds: Record<string, string> = {
  apps: "application-portfolio",
  packages: "shared-package-portfolio",
  docs: "documentation",
  emails: "email-templates",
  i18n: "localization",
  prisma: "database-schema",
  scripts: "automation",
  tests: "quality-assurance",
  tooling: "developer-tooling",
}

const segmentTags: Record<string, string> = {
  api: "api-surface",
  app: "route-layer",
  application: "application-layer",
  bootstrap: "composition-root",
  components: "ui-components",
  config: "configuration",
  domain: "domain-layer",
  docs: "documentation",
  hooks: "ui-hooks",
  integration: "integration-layer",
  lib: "library",
  manifests: "manifest-registry",
  mock: "test-double",
  mocks: "test-double",
  pages: "route-layer",
  presenters: "view-model-adapter",
  prisma: "database-schema",
  public: "static-assets",
  repositories: "repository-abstraction",
  schemas: "schema-definition",
  src: "source-root",
  state: "application-state",
  tests: "quality-assurance",
  ui: "presentation-layer",
  utils: "utility",
}

const compareNames = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
}).compare

async function exists(candidate: string): Promise<boolean> {
  try {
    await access(/* turbopackIgnore: true */ candidate)
    return true
  } catch {
    return false
  }
}

async function ensureSafeOutputDirectory(outputDirectory: string): Promise<void> {
  try {
    const metadata = await lstat(/* turbopackIgnore: true */ outputDirectory)
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error(
        ".patterns precisa ser um diretório real dentro do workspace.",
      )
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error
    }
    await mkdir(/* turbopackIgnore: true */ outputDirectory, { recursive: false })
  }
}

async function writeAtomically(filePath: string, content: string): Promise<void> {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  try {
    await writeFile(/* turbopackIgnore: true */ temporaryPath, content, "utf8")
    await rename(
      /* turbopackIgnore: true */ temporaryPath,
      /* turbopackIgnore: true */ filePath,
    )
  } finally {
    await unlink(/* turbopackIgnore: true */ temporaryPath).catch(() => undefined)
  }
}

async function findWorkspaceRoot(): Promise<string> {
  let candidate = path.resolve(/* turbopackIgnore: true */ process.cwd())

  for (let depth = 0; depth < 8; depth += 1) {
    const hasWorkspaceMarker = await exists(
      path.join(/* turbopackIgnore: true */ candidate, "pnpm-workspace.yaml"),
    )
    const hasHub = await exists(
      path.join(/* turbopackIgnore: true */ candidate, "apps", "matriz-hub"),
    )
    if (hasWorkspaceMarker && hasHub) return candidate

    const parent = path.dirname(candidate)
    if (parent === candidate) break
    candidate = parent
  }

  throw new Error(
    "Workspace Matriz não encontrado. Execute o Hub dentro do monorepo local.",
  )
}

function getTags(segments: readonly string[]): string[] {
  const tags = new Set<string>()
  const [first, second] = segments

  if (segments.length === 1 && first && topLevelKinds[first]) {
    tags.add(topLevelKinds[first])
  }
  if (first === "apps" && second) tags.add("app-boundary")
  if (first === "packages" && second) tags.add("package-boundary")
  if (first === "tests" && second === "smoke") tags.add("contract-smoke-tests")

  for (const segment of segments) {
    const tag = segmentTags[segment.toLowerCase()]
    if (tag) tags.add(tag)
  }

  return [...tags].sort(compareNames)
}

async function buildFolderMap(rootDirectory: string): Promise<LlmFolderMap> {
  const nodes: DirectoryNode[] = []
  const excluded = new Map<string, string>()
  const inaccessible: Array<{ path: string; reason: string }> = []
  let skippedSymlinks = 0

  const toProjectPath = (absolutePath: string) => {
    const relativePath = path.relative(
      /* turbopackIgnore: true */ rootDirectory,
      absolutePath,
    )
    return relativePath ? relativePath.split(path.sep).join("/") : "."
  }

  async function visit(absolutePath: string, parentId: number | null = null) {
    const id = nodes.length
    const relativePath = toProjectPath(absolutePath)
    const segments = relativePath === "." ? [] : relativePath.split("/")
    const firstSegment = segments[0]
    const node: DirectoryNode = {
      id,
      path: relativePath,
      parentId,
      name: relativePath === "." ? "." : (segments.at(-1) ?? "."),
      depth: segments.length,
      kind:
        segments.length === 1 && firstSegment
          ? (topLevelKinds[firstSegment] ?? "workspace-area")
          : "directory",
      tags: getTags(segments),
      childDirectoryCount: 0,
      descendantDirectoryCount: 0,
    }
    nodes.push(node)

    let entries
    try {
      entries = await readdir(/* turbopackIgnore: true */ absolutePath, {
        withFileTypes: true,
      })
    } catch (error) {
      const reason = error instanceof Error && "code" in error
        ? String(error.code)
        : "unreadable"
      inaccessible.push({ path: relativePath, reason })
      return node
    }

    const directories = entries
      .filter((entry) => {
        if (entry.isSymbolicLink()) {
          skippedSymlinks += 1
          return false
        }
        return entry.isDirectory()
      })
      .sort((left, right) => compareNames(left.name, right.name))

    for (const entry of directories) {
      const exclusionReason = excludedDirectories.get(entry.name)
      if (exclusionReason) {
        excluded.set(entry.name, exclusionReason)
        continue
      }

      const child = await visit(
        path.join(/* turbopackIgnore: true */ absolutePath, entry.name),
        id,
      )
      node.childDirectoryCount += 1
      node.descendantDirectoryCount += 1 + child.descendantDirectoryCount
    }

    return node
  }

  await visit(rootDirectory)

  const topLevel = nodes.filter((node) => node.parentId === 0)
  const directChildren = (parentPath: string) => {
    const parent = nodes.find((node) => node.path === parentPath)
    return parent ? nodes.filter((node) => node.parentId === parent.id) : []
  }
  const describeBoundaries = (parentPath: string): Boundary[] =>
    directChildren(parentPath).map((node) => ({
      name: node.name,
      path: node.path,
      descendantDirectoryCount: node.descendantDirectoryCount,
      directAreas: directChildren(node.path).map((child) => child.name),
    }))

  const layerSummary = [...new Set(Object.values(segmentTags))]
    .map((tag) => ({
      tag,
      directories: nodes.filter((node) => node.tags.includes(tag)).length,
    }))
    .filter((item) => item.directories > 0)
    .sort(
      (left, right) =>
        right.directories - left.directories || compareNames(left.tag, right.tag),
    )

  return {
    format: "project-folder-map/v1",
    generatedAt: new Date().toISOString(),
    root: ".",
    scope: "directories only; file names and file contents are never read",
    summary: {
      mappedDirectoryCount: nodes.length - 1,
      topLevelDirectoryCount: topLevel.length,
      skippedSymlinkCount: skippedSymlinks,
      inaccessibleDirectoryCount: inaccessible.length,
    },
    exclusionPolicy: [...excluded.entries()].map(([name, reason]) => ({
      name,
      reason,
    })),
    inaccessible,
    boundaryMap: {
      applications: describeBoundaries("apps"),
      packageGroups: describeBoundaries("packages"),
    },
    layerSummary,
    directories: nodes,
  }
}

function renderHumanMap(map: LlmFolderMap): string {
  const childrenByParent = new Map<number | null, DirectoryNode[]>()
  for (const node of map.directories) {
    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node)
    childrenByParent.set(node.parentId, siblings)
  }

  const renderTree = (node: DirectoryNode, prefix = "", isLast = true): string[] => {
    const marker = node.id === 0 ? "" : isLast ? "\\- " : "+- "
    const details = [
      node.kind,
      ...node.tags,
      `${node.descendantDirectoryCount} descendants`,
    ]
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(" | ")
    const childPrefix = node.id === 0 ? "" : `${prefix}${isLast ? "    " : "|  "}`
    const children = childrenByParent.get(node.id) ?? []
    return [
      `${prefix}${marker}${node.name}/ - ${details}`,
      ...children.flatMap((child, index) =>
        renderTree(child, childPrefix, index === children.length - 1),
      ),
    ]
  }

  const topLevel = map.directories.filter((node) => node.parentId === 0)
  const root = map.directories[0]
  const exclusions = map.exclusionPolicy.length
    ? map.exclusionPolicy.map(({ name, reason }) => `- \`${name}/\` - ${reason}`)
    : ["- None found in this workspace."]

  return [
    "# Project folder map",
    "",
    `Generated: ${map.generatedAt}`,
    "",
    "## Reading guide",
    "",
    "- Every displayed item is a directory; no project files were inspected.",
    "- Labels are structural inferences from folder names, not claims about file contents.",
    `- ${map.summary.mappedDirectoryCount} directories mapped across ${map.summary.topLevelDirectoryCount} root areas.`,
    "",
    "## High-signal structure",
    "",
    ...topLevel.map(
      (node) =>
        `- \`${node.path}/\` - ${node.kind}; ${node.descendantDirectoryCount} descendant directories.`,
    ),
    "",
    "## Detected boundaries",
    "",
    "### Applications",
    "",
    ...map.boundaryMap.applications.map(
      (item) =>
        `- \`${item.path}/\` - ${item.descendantDirectoryCount} descendants; direct areas: ${item.directAreas.map((area) => `\`${area}/\``).join(", ") || "none"}.`,
    ),
    "",
    "### Shared package groups",
    "",
    ...map.boundaryMap.packageGroups.map(
      (item) =>
        `- \`${item.path}/\` - ${item.descendantDirectoryCount} descendants; direct areas: ${item.directAreas.map((area) => `\`${area}/\``).join(", ") || "none"}.`,
    ),
    "",
    "## Detected architectural layers",
    "",
    ...map.layerSummary.map(
      (item) => `- \`${item.tag}\`: ${item.directories} directories`,
    ),
    "",
    "## Complete directory tree",
    "",
    "```text",
    ...(root ? renderTree(root) : []),
    "```",
    "",
    "## Intentional exclusions",
    "",
    ...exclusions,
    "",
    `Skipped symlinks: ${map.summary.skippedSymlinkCount}. Inaccessible directories: ${map.summary.inaccessibleDirectoryCount}.`,
    "",
  ].join("\n")
}

function getGenerationFromMap(
  map: LlmFolderMap,
  artifacts: readonly PatternArtifact[],
): PatternGeneration {
  return {
    generatedAt: map.generatedAt,
    mappedDirectoryCount: map.summary.mappedDirectoryCount,
    topLevelDirectoryCount: map.summary.topLevelDirectoryCount,
    applicationBoundaryCount: map.boundaryMap.applications.length,
    packageGroupCount: map.boundaryMap.packageGroups.length,
    skippedSymlinkCount: map.summary.skippedSymlinkCount,
    inaccessibleDirectoryCount: map.summary.inaccessibleDirectoryCount,
    artifacts,
  }
}

async function getArtifacts(outputDirectory: string): Promise<PatternArtifact[]> {
  const definitions = [
    { format: "human" as const, filename: HUMAN_FILENAME },
    { format: "llm" as const, filename: LLM_FILENAME },
  ]

  return Promise.all(
    definitions.map(async ({ format, filename }) => {
      const filePath = path.join(
        /* turbopackIgnore: true */ outputDirectory,
        filename,
      )
      const metadata = await stat(/* turbopackIgnore: true */ filePath)
      return {
        format,
        relativePath: `${OUTPUT_DIRECTORY}/${filename}`,
        sizeBytes: metadata.size,
      }
    }),
  )
}

export const filesystemPatternsGenerator: PatternsGenerator = {
  async generate() {
    const rootDirectory = await findWorkspaceRoot()
    const outputDirectory = path.join(
      /* turbopackIgnore: true */ rootDirectory,
      OUTPUT_DIRECTORY,
    )
    const map = await buildFolderMap(rootDirectory)
    const humanMap = renderHumanMap(map)

    await ensureSafeOutputDirectory(outputDirectory)
    await Promise.all([
      writeAtomically(
        path.join(
          /* turbopackIgnore: true */ outputDirectory,
          HUMAN_FILENAME,
        ),
        humanMap,
      ),
      writeAtomically(
        path.join(/* turbopackIgnore: true */ outputDirectory, LLM_FILENAME),
        `${JSON.stringify(map, null, 2)}\n`,
      ),
    ])

    return getGenerationFromMap(map, await getArtifacts(outputDirectory))
  },

  async inspect() {
    try {
      const rootDirectory = await findWorkspaceRoot()
      const outputDirectory = path.join(
        /* turbopackIgnore: true */ rootDirectory,
        OUTPUT_DIRECTORY,
      )
      const rawMap = await readFile(
        /* turbopackIgnore: true */ path.join(outputDirectory, LLM_FILENAME),
        "utf8",
      )
      const map = JSON.parse(rawMap) as LlmFolderMap
      if (map.format !== "project-folder-map/v1") return null
      return getGenerationFromMap(map, await getArtifacts(outputDirectory))
    } catch {
      return null
    }
  },

  async readArtifact(format) {
    try {
      const rootDirectory = await findWorkspaceRoot()
      const filename = format === "human" ? HUMAN_FILENAME : LLM_FILENAME
      return await readFile(
        /* turbopackIgnore: true */ path.join(
          rootDirectory,
          OUTPUT_DIRECTORY,
          filename,
        ),
        "utf8",
      )
    } catch {
      return null
    }
  },
}
