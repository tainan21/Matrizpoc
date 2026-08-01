import { constants, type BigIntStats } from "node:fs"
import { lstat, open, realpath } from "node:fs/promises"
import path from "node:path"
import type {
  LibraryAdoptionPolicy,
  PackageAdoptionReadiness,
} from "../domain/library-adoption"
import { WorkspaceError } from "../domain/errors"
import type { RegisteredPackageSummary } from "../domain/federated-sources"
import type { FederatedSourceRepository } from "../integration/filesystem/federated-source-repository"
import type { LibraryAdoptionPolicyRepository } from "../integration/filesystem/library-adoption-policy-repository"

function sorted(values: Iterable<string>): string[] {
  return [...values].sort()
}

export function evaluatePackageAdoption(input: {
  sourceId: string
  packageSummary: RegisteredPackageSummary
  policy?: LibraryAdoptionPolicy
  existingEvidence: ReadonlySet<string>
}): PackageAdoptionReadiness {
  if (
    input.packageSummary.sourceId !== input.sourceId ||
    (input.policy && input.policy.sourceId !== input.sourceId)
  ) {
    throw new WorkspaceError(
      "Fonte da prontidão não corresponde aos dados avaliados.",
      "INVALID_DATA",
    )
  }

  const rule = input.policy?.packages.find(
    (candidate) => candidate.name === input.packageSummary.name,
  )

  if (!rule) {
    return {
      sourceId: input.sourceId,
      packageName: input.packageSummary.name,
      status: "not_configured",
      ready: false,
      satisfied: [],
      missing: [],
      blockers: [],
      allowedSubpaths: [],
      evidence: [],
    }
  }

  const exportRequirements = rule.allowedSubpaths.map((item) => ({
    requirement: `export:${item}`,
    satisfied: input.packageSummary.exports.includes(item),
  }))
  const checkRequirements = rule.requiredChecks.map((item) => ({
    requirement: `check:${item}`,
    satisfied: input.packageSummary.scripts.includes(item),
  }))
  const evidenceRequirements = rule.evidence.map((item) => ({
    requirement: `evidence:${item}`,
    satisfied: input.existingEvidence.has(item),
  }))
  const requirements = [
    ...exportRequirements,
    ...checkRequirements,
    ...evidenceRequirements,
  ]
  const missing = sorted(
    requirements
      .filter((requirement) => !requirement.satisfied)
      .map((requirement) => requirement.requirement),
  )
  const blockers = sorted(rule.blockers)

  return {
    sourceId: input.sourceId,
    packageName: input.packageSummary.name,
    status: rule.status,
    ready:
      rule.status === "approved" &&
      blockers.length === 0 &&
      missing.length === 0,
    satisfied: sorted(
      requirements
        .filter((requirement) => requirement.satisfied)
        .map((requirement) => requirement.requirement),
    ),
    missing,
    blockers,
    allowedSubpaths: sorted(rule.allowedSubpaths),
    evidence: sorted(rule.evidence),
  }
}

export function describeNextAdoptionAction(
  readiness: PackageAdoptionReadiness | undefined,
): string {
  if (!readiness) {
    return "Corrigir a leitura da política antes de decidir sobre a adoção."
  }
  if (readiness.ready) {
    return "Adotar somente pelos subpaths permitidos e registrar o primeiro consumidor."
  }
  if (readiness.status === "not_configured") {
    return "Criar uma política portátil de adoção para este package."
  }

  const blocker = readiness.blockers[0]
  if (blocker) return `Resolver o bloqueador: ${blocker}`

  const missing = readiness.missing[0]
  if (missing) return `Comprovar o requisito: ${missing}.`

  if (readiness.status === "candidate") {
    return "Solicitar revisão humana para promover o package a aprovado."
  }
  if (readiness.status === "blocked") {
    return "Revisar a política e registrar um bloqueador objetivo antes de prosseguir."
  }
  return "Reavaliar o contrato: o package está aprovado, mas a prontidão não foi comprovada."
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function isSafeEvidencePath(relativePath: string): boolean {
  return (
    relativePath.length > 0 &&
    relativePath.length <= 300 &&
    relativePath.endsWith(".md") &&
    !relativePath.includes("\\") &&
    !path.posix.isAbsolute(relativePath) &&
    !/^[A-Za-z]:/.test(relativePath) &&
    relativePath.split("/").every((segment) => segment !== "" && segment !== "..")
  )
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT"
}

interface EvidenceFileHandle {
  stat(options: { bigint: true }): Promise<BigIntStats>
  close(): Promise<void>
}

interface EvidenceFileOps {
  lstat(target: string): Promise<BigIntStats>
  realpath(target: string): Promise<string>
  open(target: string, flags: number): Promise<EvidenceFileHandle>
}

const defaultEvidenceFileOps: EvidenceFileOps = {
  lstat: (target) => lstat(target, { bigint: true }),
  realpath,
  open,
}

function sameFileIdentity(left: BigIntStats, right: BigIntStats): boolean {
  const sameKind =
    left.isFile() === right.isFile() &&
    left.isDirectory() === right.isDirectory() &&
    left.isSymbolicLink() === right.isSymbolicLink()
  if (!sameKind) return false

  // Some Windows/network filesystems expose a zero inode. Without a stable
  // identity this gate fails closed instead of trusting forgeable timestamps.
  if (left.ino === 0n || right.ino === 0n) return false
  return (
    left.ino === right.ino &&
    (process.platform === "win32" || left.dev === right.dev)
  )
}

function hasStableMetadata(left: BigIntStats, right: BigIntStats): boolean {
  return (
    sameFileIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  )
}

async function isRegularContainedEvidence(
  repositoryRoot: string,
  relativePath: string,
  fileOps: EvidenceFileOps = defaultEvidenceFileOps,
): Promise<boolean> {
  if (!isSafeEvidencePath(relativePath)) return false

  const segments = relativePath.split("/")
  let current = repositoryRoot
  const componentSnapshots: Array<{
    target: string
    metadata: BigIntStats
  }> = []
  let handle: EvidenceFileHandle | undefined

  try {
    for (const [index, segment] of segments.entries()) {
      current = path.join(current, segment)
      const metadata = await fileOps.lstat(current)
      if (metadata.isSymbolicLink()) return false

      const isFinal = index === segments.length - 1
      if (isFinal ? !metadata.isFile() : !metadata.isDirectory()) return false

      const resolvedComponent = await fileOps.realpath(current)
      if (!isInside(repositoryRoot, resolvedComponent)) return false
      componentSnapshots.push({ target: current, metadata })
    }

    const resolvedTarget = await fileOps.realpath(current)
    if (!isInside(repositoryRoot, resolvedTarget)) return false

    // Windows may not expose O_NOFOLLOW. The fail-closed fallback is the
    // lstat/realpath pass plus opened-handle identity and post-open lstat pass.
    const openFlags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)
    handle = await fileOps.open(current, openFlags)
    const openedMetadata = await handle.stat({ bigint: true })
    const targetBeforeOpen = componentSnapshots.at(-1)?.metadata
    if (
      !targetBeforeOpen ||
      !openedMetadata.isFile() ||
      openedMetadata.isSymbolicLink() ||
      !hasStableMetadata(targetBeforeOpen, openedMetadata)
    ) {
      return false
    }

    for (const snapshot of componentSnapshots) {
      const metadataAfterOpen = await fileOps.lstat(snapshot.target)
      if (
        metadataAfterOpen.isSymbolicLink() ||
        !hasStableMetadata(snapshot.metadata, metadataAfterOpen)
      ) {
        return false
      }
    }

    const openedAfterValidation = await handle.stat({ bigint: true })
    return (
      openedAfterValidation.isFile() &&
      !openedAfterValidation.isSymbolicLink() &&
      hasStableMetadata(openedMetadata, openedAfterValidation)
    )
  } catch (error) {
    if (isNotFound(error)) return false
    if (error instanceof WorkspaceError) throw error
    throw new WorkspaceError(
      "Não foi possível validar a evidência de adoção.",
      "INVALID_DATA",
    )
  } finally {
    try {
      await handle?.close()
    } catch {
      throw new WorkspaceError(
        "Não foi possível encerrar a validação da evidência.",
        "INVALID_DATA",
      )
    }
  }
}

export const libraryAdoptionReadinessInternal = {
  defaultEvidenceFileOps,
  hasStableMetadata,
  isRegularContainedEvidence,
  sameFileIdentity,
}

export async function getPackageAdoptionReadiness(
  repositoryRoot: string,
  federatedSources: FederatedSourceRepository,
  policies: LibraryAdoptionPolicyRepository,
  sourceId: string,
  packageName: string,
): Promise<PackageAdoptionReadiness> {
  const [packageSummary, policy, resolvedRepositoryRoot] = await Promise.all([
    federatedSources.getPackageSummary(sourceId, packageName),
    policies.getPolicy(sourceId),
    realpath(path.resolve(repositoryRoot)),
  ])
  if (
    resolvedRepositoryRoot !== federatedSources.repositoryRoot ||
    resolvedRepositoryRoot !== policies.repositoryRoot
  ) {
    throw new WorkspaceError(
      "Repositórios de prontidão pertencem a raízes diferentes.",
      "INVALID_PATH",
    )
  }
  const rule = policy?.packages.find(
    (candidate) => candidate.name === packageSummary.name,
  )
  const existingEvidence = new Set<string>()

  for (const evidencePath of rule?.evidence ?? []) {
    if (
      await isRegularContainedEvidence(resolvedRepositoryRoot, evidencePath)
    ) {
      existingEvidence.add(evidencePath)
    }
  }

  return evaluatePackageAdoption({
    sourceId,
    packageSummary,
    policy,
    existingEvidence,
  })
}
