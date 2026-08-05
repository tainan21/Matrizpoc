import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { LibraryAdoptionPolicy } from "../domain/library-adoption"
import type { RegisteredPackageSummary } from "../domain/federated-sources"
import { FederatedSourceRepository } from "../integration/filesystem/federated-source-repository"
import { LibraryAdoptionPolicyRepository } from "../integration/filesystem/library-adoption-policy-repository"
import {
  describeNextAdoptionAction,
  evaluatePackageAdoption,
  getPackageAdoptionReadiness,
  libraryAdoptionReadinessInternal,
} from "./library-adoption-readiness"

const roots: string[] = []

const packageSummary: RegisteredPackageSummary = {
  sourceId: "matriz-lib-ui",
  name: "@matriz/tokens",
  version: "1.0.0",
  exports: [".", "./css"],
  dependencies: [],
  peerDependencies: [],
  scripts: ["build", "typecheck"],
}

function policy(
  overrides: Partial<LibraryAdoptionPolicy["packages"][number]> = {},
): LibraryAdoptionPolicy {
  return {
    schemaVersion: 1,
    sourceId: "matriz-lib-ui",
    distribution: {
      channel: "github_packages",
      registry: "https://npm.pkg.github.com",
      coordinatedReleases: true,
    },
    packages: [
      {
        name: "@matriz/tokens",
        status: "candidate",
        allowedSubpaths: [".", "./css"],
        requiredChecks: ["build", "typecheck"],
        blockers: [],
        evidence: ["docs/adoption.md"],
        ...overrides,
      },
    ],
  }
}

async function readinessFixture() {
  const repositoryRoot = await mkdtemp(
    path.join(os.tmpdir(), "matriz-readiness-repository-"),
  )
  const sourceRoot = await mkdtemp(
    path.join(os.tmpdir(), "matriz-readiness-source-"),
  )
  roots.push(repositoryRoot, sourceRoot)

  await mkdir(path.join(repositoryRoot, ".matriz", "local"), {
    recursive: true,
  })
  await mkdir(path.join(repositoryRoot, ".matriz", "adoption-policies"), {
    recursive: true,
  })
  await mkdir(path.join(sourceRoot, "packages", "tokens"), {
    recursive: true,
  })
  await writeFile(
    path.join(sourceRoot, "package.json"),
    JSON.stringify({ name: "matriz-lib-ui" }),
  )
  await writeFile(
    path.join(sourceRoot, "packages", "tokens", "package.json"),
    JSON.stringify({
      name: "@matriz/tokens",
      exports: { ".": "./dist/index.js", "./css": "./dist/tokens.css" },
      scripts: { build: "example", typecheck: "example" },
    }),
  )
  await writeFile(
    path.join(repositoryRoot, ".matriz", "repositories.json"),
    JSON.stringify({
      schemaVersion: 1,
      sources: [
        {
          id: "matriz-lib-ui",
          name: "Matriz Lib UI",
          kind: "library",
          gitRemote: "https://github.com/example/matriz-lib-ui.git",
          documentationIncludes: ["README.md", "docs/**/*.md"],
        },
      ],
    }),
  )
  await writeFile(
    path.join(repositoryRoot, ".matriz", "local", "repository-bindings.json"),
    JSON.stringify({
      schemaVersion: 1,
      bindings: [
        {
          sourceId: "matriz-lib-ui",
          absolutePath: sourceRoot,
          enabled: true,
          access: "read_only",
        },
      ],
    }),
  )
  await writeFile(
    path.join(
      repositoryRoot,
      ".matriz",
      "adoption-policies",
      "matriz-lib-ui.json",
    ),
    JSON.stringify(policy({ status: "approved" })),
  )

  return {
    repositoryRoot,
    sourceRoot,
    federatedSources: await FederatedSourceRepository.create(repositoryRoot),
    policies: await LibraryAdoptionPolicyRepository.create(repositoryRoot),
  }
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

describe("evaluatePackageAdoption", () => {
  it("returns not configured when the source has no policy", () => {
    expect(
      evaluatePackageAdoption({
        sourceId: "matriz-lib-ui",
        packageSummary,
        existingEvidence: new Set(),
      }),
    ).toEqual({
      sourceId: "matriz-lib-ui",
      packageName: "@matriz/tokens",
      status: "not_configured",
      ready: false,
      satisfied: [],
      missing: [],
      blockers: [],
      allowedSubpaths: [],
      evidence: [],
    })
  })

  it("reports missing exports and checks in deterministic order", () => {
    const result = evaluatePackageAdoption({
      sourceId: "matriz-lib-ui",
      packageSummary: {
        ...packageSummary,
        exports: ["."],
        scripts: ["build"],
      },
      policy: policy({ evidence: [] }),
      existingEvidence: new Set(),
    })

    expect(result.status).toBe("candidate")
    expect(result.ready).toBe(false)
    expect(result.missing).toEqual(["check:typecheck", "export:./css"])
  })

  it("marks an approved package ready when every requirement is satisfied", () => {
    const result = evaluatePackageAdoption({
      sourceId: "matriz-lib-ui",
      packageSummary,
      policy: policy({ status: "approved" }),
      existingEvidence: new Set(["docs/adoption.md"]),
    })

    expect(result.ready).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.satisfied).toEqual([
      "check:build",
      "check:typecheck",
      "evidence:docs/adoption.md",
      "export:.",
      "export:./css",
    ])
  })

  it("keeps an otherwise approved package blocked by any declared blocker", () => {
    const result = evaluatePackageAdoption({
      sourceId: "matriz-lib-ui",
      packageSummary,
      policy: policy({
        status: "approved",
        blockers: ["Audit is still open."],
      }),
      existingEvidence: new Set(["docs/adoption.md"]),
    })

    expect(result.ready).toBe(false)
    expect(result.blockers).toEqual(["Audit is still open."])
  })

  it("rejects a package projection from another source", () => {
    expect(() =>
      evaluatePackageAdoption({
        sourceId: "matriz-lib-ui",
        packageSummary: { ...packageSummary, sourceId: "other-source" },
        policy: policy(),
        existingEvidence: new Set(),
      }),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_DATA" }),
    )
  })

  it("rejects a policy from another source", () => {
    expect(() =>
      evaluatePackageAdoption({
        sourceId: "matriz-lib-ui",
        packageSummary,
        policy: { ...policy(), sourceId: "other-source" },
        existingEvidence: new Set(),
      }),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_DATA" }),
    )
  })
})

describe("describeNextAdoptionAction", () => {
  const readiness = evaluatePackageAdoption({
    sourceId: "matriz-lib-ui",
    packageSummary,
    policy: policy({ status: "candidate" }),
    existingEvidence: new Set(["docs/adoption.md"]),
  })

  it("prioritizes blockers, then missing requirements, then human promotion", () => {
    expect(
      describeNextAdoptionAction({
        ...readiness,
        blockers: ["Concluir auditoria."],
        missing: ["check:typecheck"],
      }),
    ).toBe("Resolver o bloqueador: Concluir auditoria.")
    expect(
      describeNextAdoptionAction({
        ...readiness,
        blockers: [],
        missing: ["check:typecheck"],
      }),
    ).toBe("Comprovar o requisito: check:typecheck.")
    expect(
      describeNextAdoptionAction({
        ...readiness,
        blockers: [],
        missing: [],
      }),
    ).toBe("Solicitar revisão humana para promover o package a aprovado.")
  })

  it("orients ready, not configured and unavailable states", () => {
    expect(describeNextAdoptionAction({ ...readiness, ready: true })).toBe(
      "Adotar somente pelos subpaths permitidos e registrar o primeiro consumidor.",
    )
    expect(
      describeNextAdoptionAction({
        ...readiness,
        status: "not_configured",
        blockers: [],
        missing: [],
      }),
    ).toBe("Criar uma política portátil de adoção para este package.")
    expect(describeNextAdoptionAction(undefined)).toBe(
      "Corrigir a leitura da política antes de decidir sobre a adoção.",
    )
  })
})

describe("getPackageAdoptionReadiness", () => {
  it("keeps a missing evidence file in the missing requirements", async () => {
    const fixture = await readinessFixture()

    const result = await getPackageAdoptionReadiness(
      fixture.repositoryRoot,
      fixture.federatedSources,
      fixture.policies,
      "matriz-lib-ui",
      "@matriz/tokens",
    )

    expect(result.ready).toBe(false)
    expect(result.missing).toEqual(["evidence:docs/adoption.md"])
  })

  it("counts a stable regular Markdown evidence file", async () => {
    const fixture = await readinessFixture()
    await mkdir(path.join(fixture.repositoryRoot, "docs"))
    await writeFile(
      path.join(fixture.repositoryRoot, "docs", "adoption.md"),
      "# Adoption evidence\n",
    )

    const result = await getPackageAdoptionReadiness(
      fixture.repositoryRoot,
      fixture.federatedSources,
      fixture.policies,
      "matriz-lib-ui",
      "@matriz/tokens",
    )

    expect(result.ready).toBe(true)
    expect(result.satisfied).toContain("evidence:docs/adoption.md")
  })

  it("does not count a file symlink as evidence", async () => {
    const fixture = await readinessFixture()
    const outsideEvidence = path.join(fixture.sourceRoot, "outside.md")
    await writeFile(outsideEvidence, "# Outside\n")
    await mkdir(path.join(fixture.repositoryRoot, "docs"))
    await symlink(
      outsideEvidence,
      path.join(fixture.repositoryRoot, "docs", "adoption.md"),
      "file",
    )

    const result = await getPackageAdoptionReadiness(
      fixture.repositoryRoot,
      fixture.federatedSources,
      fixture.policies,
      "matriz-lib-ui",
      "@matriz/tokens",
    )

    expect(result.missing).toContain("evidence:docs/adoption.md")
  })

  it("does not count evidence below an ancestor junction", async () => {
    const fixture = await readinessFixture()
    const outsideDirectory = path.join(fixture.sourceRoot, "outside-docs")
    await mkdir(outsideDirectory)
    await writeFile(path.join(outsideDirectory, "adoption.md"), "# Outside\n")
    await symlink(
      outsideDirectory,
      path.join(fixture.repositoryRoot, "docs"),
      process.platform === "win32" ? "junction" : "dir",
    )

    const result = await getPackageAdoptionReadiness(
      fixture.repositoryRoot,
      fixture.federatedSources,
      fixture.policies,
      "matriz-lib-ui",
      "@matriz/tokens",
    )

    expect(result.missing).toContain("evidence:docs/adoption.md")
  })

  it("rejects repository objects created for different roots", async () => {
    const fixture = await readinessFixture()
    const other = await readinessFixture()

    await expect(
      getPackageAdoptionReadiness(
        fixture.repositoryRoot,
        fixture.federatedSources,
        other.policies,
        "matriz-lib-ui",
        "@matriz/tokens",
      ),
    ).rejects.toMatchObject({ code: "INVALID_PATH" })
  })
})

describe("evidence filesystem failures", () => {
  it("maps unexpected I/O failures to bounded invalid data errors", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-readiness-io-"))
    roots.push(root)

    await expect(
      libraryAdoptionReadinessInternal.isRegularContainedEvidence(
        root,
        "docs/adoption.md",
        {
          ...libraryAdoptionReadinessInternal.defaultEvidenceFileOps,
          lstat: async () => {
            const error = new Error("permission denied") as NodeJS.ErrnoException
            error.code = "EACCES"
            throw error
          },
        },
      ),
    ).rejects.toMatchObject({ code: "INVALID_DATA" })
  })

  it("rejects an ancestor whose identity changes during validation", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-readiness-race-"))
    roots.push(root)
    const docs = path.join(root, "docs")
    const replacement = path.join(root, "replacement")
    await mkdir(docs)
    await mkdir(replacement)
    await writeFile(path.join(docs, "adoption.md"), "# Evidence\n")
    let docsReads = 0

    await expect(
      libraryAdoptionReadinessInternal.isRegularContainedEvidence(
        root,
        "docs/adoption.md",
        {
          ...libraryAdoptionReadinessInternal.defaultEvidenceFileOps,
          lstat: async (target) => {
            if (target === docs && ++docsReads === 2) {
              return libraryAdoptionReadinessInternal.defaultEvidenceFileOps.lstat(
                replacement,
              )
            }
            return libraryAdoptionReadinessInternal.defaultEvidenceFileOps.lstat(
              target,
            )
          },
        },
      ),
    ).resolves.toBe(false)
  })
})
