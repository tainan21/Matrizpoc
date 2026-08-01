import { mkdtemp, mkdir, rename, rm, symlink, unlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  LibraryAdoptionPolicyRepository,
  libraryAdoptionPolicyRepositoryInternal,
} from "./library-adoption-policy-repository"

const roots: string[] = []

function policy(sourceId = "matriz-lib-ui") {
  return {
    schemaVersion: 1,
    sourceId,
    distribution: {
      channel: "github_packages",
      registry: "https://npm.pkg.github.com",
      coordinatedReleases: true,
    },
    packages: [],
  }
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-policy-"))
  roots.push(root)
  const policiesDirectory = path.join(root, ".matriz", "adoption-policies")
  await mkdir(policiesDirectory, { recursive: true })
  await writeFile(
    path.join(policiesDirectory, "matriz-lib-ui.json"),
    JSON.stringify(policy()),
  )

  return {
    root,
    policiesDirectory,
    repository: await LibraryAdoptionPolicyRepository.create(root),
  }
}

function chunkedReader(chunks: Buffer[]) {
  return {
    async read(buffer: Buffer, offset: number, length: number) {
      const chunk = chunks.shift() ?? Buffer.alloc(0)
      const bytesRead = Math.min(chunk.length, length)
      chunk.copy(buffer, offset, 0, bytesRead)
      return { bytesRead }
    },
  }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("LibraryAdoptionPolicyRepository", () => {
  it("reads every short chunk before accepting policy JSON", async () => {
    const source = Buffer.from(`${JSON.stringify(policy())}\ntrailing`)
    const content = await libraryAdoptionPolicyRepositoryInternal.readBoundedFile(
      chunkedReader([
        source.subarray(0, 4),
        source.subarray(4, 19),
        source.subarray(19),
      ]),
    )

    expect(content.toString("utf8")).toBe(source.toString("utf8"))
    expect(() => JSON.parse(content.toString("utf8"))).toThrow()
  })

  it("rejects same-inode metadata drift", () => {
    const original = { dev: 1n, ino: 2n, size: 3n, mtimeNs: 4n, ctimeNs: 5n }

    expect(
      libraryAdoptionPolicyRepositoryInternal.hasStableFileMetadata(
        original,
        original,
      ),
    ).toBe(true)
    expect(
      libraryAdoptionPolicyRepositoryInternal.hasStableFileMetadata(
        original,
        { ...original, size: 4n },
      ),
    ).toBe(false)
    expect(
      libraryAdoptionPolicyRepositoryInternal.hasStableFileMetadata(
        original,
        { ...original, mtimeNs: 6n },
      ),
    ).toBe(false)
    expect(
      libraryAdoptionPolicyRepositoryInternal.hasStableFileMetadata(
        original,
        { ...original, ctimeNs: 6n },
      ),
    ).toBe(false)
  })

  it("returns undefined when a source has no policy", async () => {
    const { repository } = await fixture()

    await expect(repository.getPolicy("missing-source")).resolves.toBeUndefined()
  })

  it("rejects source ID traversal", async () => {
    const { repository } = await fixture()

    await expect(repository.getPolicy("../outside")).rejects.toMatchObject({
      code: "INVALID_PATH",
    })
  })

  it("reads a valid policy for the requested source", async () => {
    const { repository } = await fixture()

    await expect(repository.getPolicy("matriz-lib-ui")).resolves.toMatchObject({
      sourceId: "matriz-lib-ui",
    })
  })

  it("rejects a policy file symlinked outside the policy directory", async () => {
    const { policiesDirectory, repository } = await fixture()
    const outside = await mkdtemp(path.join(os.tmpdir(), "matriz-policy-outside-"))
    roots.push(outside)
    const outsidePolicy = path.join(outside, "matriz-lib-ui.json")
    const policyPath = path.join(policiesDirectory, "matriz-lib-ui.json")
    await writeFile(outsidePolicy, JSON.stringify(policy()))
    await unlink(policyPath)
    await symlink(outsidePolicy, policyPath, "file")

    await expect(repository.getPolicy("matriz-lib-ui")).rejects.toMatchObject({
      code: "INVALID_PATH",
    })
  })

  it("rejects an ancestor junction even when it still resolves inside the repository", async () => {
    const { root, repository } = await fixture()
    const matrixRoot = path.join(root, ".matriz")
    const linkedMatrixRoot = path.join(root, ".matriz-real")
    await rename(matrixRoot, linkedMatrixRoot)
    await symlink(linkedMatrixRoot, matrixRoot, "junction")

    await expect(repository.getPolicy("matriz-lib-ui")).rejects.toMatchObject({
      code: "INVALID_PATH",
    })
  })

  it("rejects a policy larger than 256 KB", async () => {
    const { policiesDirectory, repository } = await fixture()
    await writeFile(path.join(policiesDirectory, "matriz-lib-ui.json"), Buffer.alloc(256_001))

    await expect(repository.getPolicy("matriz-lib-ui")).rejects.toMatchObject({
      code: "LIMIT_EXCEEDED",
    })
  })

  it("rejects a directory where a policy file is expected", async () => {
    const { policiesDirectory, repository } = await fixture()
    const policyPath = path.join(policiesDirectory, "matriz-lib-ui.json")
    await unlink(policyPath)
    await mkdir(policyPath)

    await expect(repository.getPolicy("matriz-lib-ui")).rejects.toMatchObject({
      code: "INVALID_DATA",
    })
  })

  it("maps malformed policy JSON to INVALID_DATA", async () => {
    const { policiesDirectory, repository } = await fixture()
    await writeFile(path.join(policiesDirectory, "matriz-lib-ui.json"), "{")

    await expect(repository.getPolicy("matriz-lib-ui")).rejects.toMatchObject({
      code: "INVALID_DATA",
    })
  })

  it("rejects a valid JSON prefix followed by trailing bytes", async () => {
    const { policiesDirectory, repository } = await fixture()
    await writeFile(
      path.join(policiesDirectory, "matriz-lib-ui.json"),
      `${JSON.stringify(policy())}\ntrailing`,
    )

    await expect(repository.getPolicy("matriz-lib-ui")).rejects.toMatchObject({
      code: "INVALID_DATA",
    })
  })

  it("rejects a policy whose source ID does not match its filename", async () => {
    const { policiesDirectory, repository } = await fixture()
    await writeFile(
      path.join(policiesDirectory, "matriz-lib-ui.json"),
      JSON.stringify(policy("another-source")),
    )

    await expect(repository.getPolicy("matriz-lib-ui")).rejects.toMatchObject({
      code: "INVALID_DATA",
    })
  })

  it("maps schema-invalid policy data to INVALID_DATA", async () => {
    const { policiesDirectory, repository } = await fixture()
    await writeFile(
      path.join(policiesDirectory, "matriz-lib-ui.json"),
      JSON.stringify({ ...policy(), distribution: { channel: "file" } }),
    )

    await expect(repository.getPolicy("matriz-lib-ui")).rejects.toMatchObject({
      code: "INVALID_DATA",
    })
  })
})
