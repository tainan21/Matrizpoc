import { realpath, stat } from "node:fs/promises"
import { basename } from "node:path"
import type { ProjectRootStorePort, RootCandidatePort } from "../src/modules/projects/ports"
import { assertAllowedCanonicalRoot, type RootPolicyContext } from "../src/modules/projects/domain/root-policy"

type Options = {
  pickDirectory(): Promise<string | null>
  findRegisteredPath(rootRef: string): Promise<string | undefined>
  policy: RootPolicyContext
  id(): string
  rootId(): string
}

export class ElectronProjectRootAdapter implements RootCandidatePort, ProjectRootStorePort {
  private readonly candidates = new Map<string, string>()
  constructor(private readonly options: Options) {}

  async pick(): Promise<{ candidateId: string } | null> {
    const selected = await this.options.pickDirectory()
    if (!selected) return null
    const candidateId = this.options.id()
    this.candidates.set(candidateId, selected)
    return { candidateId }
  }

  async registerCandidate(candidateId: string) {
    const selected = this.candidates.get(candidateId)
    if (!selected) throw new Error("Unknown or expired root candidate")
    this.candidates.delete(candidateId)
    const canonicalPath = assertAllowedCanonicalRoot(await realpath(selected), this.options.policy)
    if (!(await stat(canonicalPath)).isDirectory()) throw new Error("Project root must be an existing directory")
    return { rootRef: this.options.rootId(), canonicalPath, displayName: basename(canonicalPath) }
  }

  async resolve(rootRef: string): Promise<string> {
    const path = await this.options.findRegisteredPath(rootRef)
    if (!path) throw new Error("Unknown project root")
    return path
  }

  async remove(_rootRef: string): Promise<void> {
    // Catalog removal intentionally never deletes or mutates the project root.
  }
}
