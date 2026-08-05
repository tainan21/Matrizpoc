import { mkdir, realpath } from "node:fs/promises"
import path from "node:path"
import { WorkspaceError } from "../../domain/errors"

const PROJECT_ID = /^[a-z0-9][a-z0-9-]*$/
const SEGMENT = /^[a-z][a-z0-9-]*$/

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

export async function resolveIntegrationDirectory(
  repositoryRoot: string,
  projectId: string,
  segments: string[],
  create = false,
): Promise<string> {
  if (!PROJECT_ID.test(projectId) || !segments.length || segments.some((part) => !SEGMENT.test(part))) {
    throw new WorkspaceError("Caminho de integração inválido.", "INVALID_PATH")
  }
  const appsRoot = await realpath(path.join(repositoryRoot, "apps"))
  const projectRoot = await realpath(path.join(appsRoot, projectId)).catch(() => {
    throw new WorkspaceError("Projeto não encontrado.", "NOT_FOUND")
  })
  if (!isInside(appsRoot, projectRoot) || projectRoot === appsRoot) {
    throw new WorkspaceError("Projeto fora de apps/.", "INVALID_PATH")
  }
  const matrixRoot = await realpath(path.join(projectRoot, ".matriz")).catch(() => {
    throw new WorkspaceError("Workspace ainda não inicializado.", "NOT_INITIALIZED")
  })
  if (!isInside(projectRoot, matrixRoot) || matrixRoot === projectRoot) {
    throw new WorkspaceError("Workspace aponta para fora do projeto.", "INVALID_PATH")
  }
  const target = path.join(matrixRoot, "integrations", ...segments)
  if (create) await mkdir(target, { recursive: true })
  const resolved = await realpath(target).catch(() => {
    throw new WorkspaceError("Integração ainda não possui registros.", "NOT_FOUND")
  })
  if (!isInside(matrixRoot, resolved)) {
    throw new WorkspaceError("Diretório de integração fora do workspace.", "INVALID_PATH")
  }
  return resolved
}
