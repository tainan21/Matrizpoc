import { constants, type BigIntStats } from "node:fs"
import { lstat, open, realpath } from "node:fs/promises"
import path from "node:path"
import {
  libraryAdoptionPolicySchema,
  type LibraryAdoptionPolicy,
} from "../../domain/library-adoption"
import { WorkspaceError } from "../../domain/errors"

const MAX_POLICY_BYTES = 256_000
const SOURCE_ID = /^[a-z0-9][a-z0-9-]*$/
const POLICY_OPEN_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT"
}

interface StableFileMetadata {
  dev: bigint
  ino: bigint
  size: bigint
  mtimeNs: bigint
  ctimeNs: bigint
}

interface BoundedFileReader {
  read(
    buffer: Buffer,
    offset: number,
    length: number,
    position: number | null,
  ): Promise<{ bytesRead: number }>
}

function hasStableFileMetadata(
  left: StableFileMetadata,
  right: StableFileMetadata,
): boolean {
  if (!left.ino || !right.ino) return false
  return (
    left.ino === right.ino &&
    (process.platform === "win32" || left.dev === right.dev) &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  )
}

function assertDirectory(metadata: BigIntStats, label: string): void {
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new WorkspaceError(`${label} inválido.`, "INVALID_PATH")
  }
}

function assertPolicyFile(metadata: BigIntStats): void {
  if (metadata.isSymbolicLink()) {
    throw new WorkspaceError("Arquivo de política não pode ser um link simbólico.", "INVALID_PATH")
  }
  if (!metadata.isFile()) {
    throw new WorkspaceError("Arquivo de política inválido.", "INVALID_DATA")
  }
  if (metadata.size > BigInt(MAX_POLICY_BYTES)) {
    throw new WorkspaceError("Política excede o limite de 256 KB.", "LIMIT_EXCEEDED")
  }
}

async function lstatOrUndefined(target: string): Promise<BigIntStats | undefined> {
  try {
    return await lstat(target, { bigint: true })
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

async function readBoundedFile(handle: BoundedFileReader): Promise<Buffer> {
  const chunks: Buffer[] = []
  let totalBytes = 0

  while (totalBytes <= MAX_POLICY_BYTES) {
    const buffer = Buffer.allocUnsafe(
      Math.min(64_000, MAX_POLICY_BYTES + 1 - totalBytes),
    )
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, totalBytes)
    if (bytesRead === 0) return Buffer.concat(chunks, totalBytes)

    chunks.push(buffer.subarray(0, bytesRead))
    totalBytes += bytesRead
    if (totalBytes > MAX_POLICY_BYTES) {
      throw new WorkspaceError("Política excede o limite de 256 KB.", "LIMIT_EXCEEDED")
    }
  }

  throw new WorkspaceError("Política excede o limite de 256 KB.", "LIMIT_EXCEEDED")
}

export const libraryAdoptionPolicyRepositoryInternal = {
  hasStableFileMetadata,
  readBoundedFile,
}

async function realpathOrUndefined(target: string): Promise<string | undefined> {
  try {
    return await realpath(target)
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

export class LibraryAdoptionPolicyRepository {
  private constructor(readonly repositoryRoot: string) {}

  static async create(repositoryRoot: string): Promise<LibraryAdoptionPolicyRepository> {
    try {
      return new LibraryAdoptionPolicyRepository(
        await realpath(path.resolve(repositoryRoot)),
      )
    } catch (error) {
      if (isNotFound(error)) {
        throw new WorkspaceError("Raiz do repositório não encontrada.", "NOT_FOUND")
      }
      throw new WorkspaceError("Raiz do repositório inválida.", "INVALID_PATH")
    }
  }

  async getPolicy(sourceId: string): Promise<LibraryAdoptionPolicy | undefined> {
    if (!SOURCE_ID.test(sourceId)) {
      throw new WorkspaceError("Identificador de fonte inválido.", "INVALID_PATH")
    }

    const matrixDirectory = path.join(this.repositoryRoot, ".matriz")
    const policiesDirectory = path.join(matrixDirectory, "adoption-policies")
    const target = path.join(policiesDirectory, `${sourceId}.json`)
    let handle: Awaited<ReturnType<typeof open>> | undefined

    try {
      const matrixBefore = await lstatOrUndefined(matrixDirectory)
      if (!matrixBefore) return undefined
      assertDirectory(matrixBefore, "Diretório .matriz")

      const policiesBefore = await lstatOrUndefined(policiesDirectory)
      if (!policiesBefore) return undefined
      assertDirectory(policiesBefore, "Diretório de políticas")

      const targetBefore = await lstatOrUndefined(target)
      if (!targetBefore) return undefined
      assertPolicyFile(targetBefore)

      const resolvedMatrixDirectory = await realpathOrUndefined(matrixDirectory)
      const resolvedPoliciesDirectory = await realpathOrUndefined(policiesDirectory)
      const resolvedTarget = await realpathOrUndefined(target)
      if (!resolvedMatrixDirectory || !resolvedPoliciesDirectory || !resolvedTarget) {
        return undefined
      }
      if (
        !isInside(this.repositoryRoot, resolvedMatrixDirectory) ||
        !isInside(resolvedMatrixDirectory, resolvedPoliciesDirectory) ||
        !isInside(resolvedPoliciesDirectory, resolvedTarget)
      ) {
        throw new WorkspaceError("Diretório de políticas fora do repositório.", "INVALID_PATH")
      }

      handle = await open(target, POLICY_OPEN_FLAGS)
      const openedMetadata = await handle.stat({ bigint: true })
      assertPolicyFile(openedMetadata)
      if (!hasStableFileMetadata(targetBefore, openedMetadata)) {
        throw new WorkspaceError("Política mudou durante a abertura.", "INVALID_PATH")
      }

      const content = await readBoundedFile(handle)

      const openedAfterRead = await handle.stat({ bigint: true })
      assertPolicyFile(openedAfterRead)
      if (!hasStableFileMetadata(openedMetadata, openedAfterRead)) {
        throw new WorkspaceError("Política mudou durante a leitura.", "INVALID_DATA")
      }

      const [matrixAfter, policiesAfter, targetAfter] = await Promise.all([
        lstatOrUndefined(matrixDirectory),
        lstatOrUndefined(policiesDirectory),
        lstatOrUndefined(target),
      ])
      if (!matrixAfter || !policiesAfter || !targetAfter) return undefined
      assertDirectory(matrixAfter, "Diretório .matriz")
      assertDirectory(policiesAfter, "Diretório de políticas")
      assertPolicyFile(targetAfter)
      if (
        !hasStableFileMetadata(matrixBefore, matrixAfter) ||
        !hasStableFileMetadata(policiesBefore, policiesAfter) ||
        !hasStableFileMetadata(openedMetadata, targetAfter)
      ) {
        throw new WorkspaceError("Política mudou durante a leitura.", "INVALID_PATH")
      }

      const policy = libraryAdoptionPolicySchema.parse(
        JSON.parse(content.toString("utf8")),
      )
      if (policy.sourceId !== sourceId) {
        throw new WorkspaceError("Fonte da política não corresponde ao arquivo.", "INVALID_DATA")
      }
      return policy
    } catch (error) {
      if (isNotFound(error)) return undefined
      if (error instanceof WorkspaceError) throw error
      throw new WorkspaceError("Política de adoção inválida.", "INVALID_DATA")
    } finally {
      await handle?.close().catch(() => undefined)
    }
  }
}
