import { readFile, realpath, stat } from "node:fs/promises"
import path from "node:path"
import type {
  DiscoveredProject,
  WorkspaceRepository,
} from "../integration/filesystem/workspace-repository"

export interface ProjectInventory {
  project: {
    id: string
    name: string
    packageName: string
    description: string
    relativePath: string
    initialized: boolean
    corrupted: boolean
  }
  local: {
    folders: string[]
    scripts: string[]
    technologies: string[]
    hasReadme: boolean
    hasAgentInstructions: boolean
  }
  git: {
    detected: boolean
    branch?: string
    provider?: "github" | "gitlab" | "bitbucket" | "other"
    host?: string
    repository?: string
  }
  vercel: {
    configured: boolean
    scope: "app" | "repository" | "none"
    projectName?: string
  }
}

interface GitMetadata {
  detected: boolean
  branch?: string
  provider?: ProjectInventory["git"]["provider"]
  host?: string
  repository?: string
}

interface VercelProjectFile {
  projectName?: unknown
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(/* turbopackIgnore: true */ target)).isFile()
  } catch {
    return false
  }
}

function parseRemote(value: string): Omit<GitMetadata, "detected" | "branch"> {
  const trimmed = value.trim()
  let host = ""
  let repository = ""

  try {
    const parsed = new URL(trimmed)
    host = parsed.hostname.toLowerCase()
    repository = parsed.pathname.replace(/^\/+|\.git$/g, "")
  } catch {
    const ssh = trimmed.match(/^(?:[^@]+@)?([^:]+):(.+)$/)
    if (ssh) {
      host = ssh[1]?.toLowerCase() ?? ""
      repository = (ssh[2] ?? "").replace(/^\/+|\.git$/g, "")
    }
  }

  const provider =
    host === "github.com"
      ? "github"
      : host === "gitlab.com"
        ? "gitlab"
        : host === "bitbucket.org"
          ? "bitbucket"
          : host
            ? "other"
            : undefined

  return {
    provider,
    host: host || undefined,
    repository: repository || undefined,
  }
}

async function readGitMetadata(repositoryRoot: string): Promise<GitMetadata> {
  const gitRoot = path.join(/* turbopackIgnore: true */ repositoryRoot, ".git")
  try {
    if (!(await stat(/* turbopackIgnore: true */ gitRoot)).isDirectory()) return { detected: false }
    const resolved = await realpath(/* turbopackIgnore: true */ gitRoot)
    if (
      path.dirname(resolved) !==
      path.resolve(/* turbopackIgnore: true */ repositoryRoot)
    ) return { detected: false }

    const [head, config] = await Promise.all([
      readFile(
        /* turbopackIgnore: true */ path.join(
          /* turbopackIgnore: true */ resolved,
          "HEAD",
        ),
        "utf8",
      ),
      readFile(
        /* turbopackIgnore: true */ path.join(
          /* turbopackIgnore: true */ resolved,
          "config",
        ),
        "utf8",
      ).catch(() => ""),
    ])
    const branch = head.trim().match(/^ref:\s+refs\/heads\/(.+)$/)?.[1]
    const originSection = config.match(/\[remote\s+"origin"\]([\s\S]*?)(?=\n\[|$)/)?.[1] ?? ""
    const remote = originSection.match(/^\s*url\s*=\s*(.+)$/m)?.[1]

    return {
      detected: true,
      branch,
      ...(remote ? parseRemote(remote) : {}),
    }
  } catch {
    return { detected: false }
  }
}

async function readVercelMetadata(
  repositoryRoot: string,
  project: DiscoveredProject,
): Promise<ProjectInventory["vercel"]> {
  const candidates = [
    {
      file: path.join(
        /* turbopackIgnore: true */ repositoryRoot,
        project.relativePath,
        ".vercel",
        "project.json",
      ),
      scope: "app" as const,
    },
    {
      file: path.join(/* turbopackIgnore: true */ repositoryRoot, ".vercel", "project.json"),
      scope: "repository" as const,
    },
  ]

  for (const candidate of candidates) {
    if (!(await isFile(candidate.file))) continue
    try {
      const parsed = JSON.parse(
        await readFile(/* turbopackIgnore: true */ candidate.file, "utf8"),
      ) as VercelProjectFile
      return {
        configured: true,
        scope: candidate.scope,
        projectName:
          typeof parsed.projectName === "string" && parsed.projectName.trim()
            ? parsed.projectName.trim().slice(0, 120)
            : undefined,
      }
    } catch {
      return { configured: true, scope: candidate.scope }
    }
  }

  return { configured: false, scope: "none" }
}

export async function buildProjectInventories(
  repository: WorkspaceRepository,
): Promise<ProjectInventory[]> {
  const [projects, git] = await Promise.all([
    repository.discoverProjects(),
    readGitMetadata(repository.repositoryRoot),
  ])

  return Promise.all(
    projects.map(async (project) => ({
      project: {
        id: project.id,
        name: project.displayName,
        packageName: project.packageName,
        description: project.description,
        relativePath: project.relativePath,
        initialized: project.initialized,
        corrupted: project.corrupted,
      },
      local: {
        folders: project.topLevelFolders,
        scripts: project.scripts,
        technologies: project.technologies,
        hasReadme: project.hasReadme,
        hasAgentInstructions: project.hasAgentInstructions,
      },
      git,
      vercel: await readVercelMetadata(repository.repositoryRoot, project),
    })),
  )
}

export async function getProjectInventory(
  repository: WorkspaceRepository,
  projectId: string,
): Promise<ProjectInventory> {
  const inventory = (await buildProjectInventories(repository)).find(
    (item) => item.project.id === projectId,
  )
  if (!inventory) throw new Error("Projeto não encontrado.")
  return inventory
}
