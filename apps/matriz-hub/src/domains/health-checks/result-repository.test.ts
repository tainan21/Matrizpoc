import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { HealthCheckRunResult } from "./domain"
import { createFileHealthCheckResultRepository } from "./result-repository"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true }),
  ))
})

function run(): HealthCheckRunResult {
  return {
    version: "myhub-health-check/v1",
    id: "run-1",
    kind: "routes",
    environment: "development",
    startedAt: "2026-08-14T00:00:00.000Z",
    finishedAt: "2026-08-14T00:00:01.000Z",
    durationMs: 1_000,
    summary: { total: 1, tested: 1, ok: 1, failures: 0 },
    results: [],
  }
}

describe("file health-check result repository", () => {
  it("persists and reloads only the latest result", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "myhub-store-"))
    temporaryDirectories.push(workspaceRoot)
    const repository = createFileHealthCheckResultRepository(workspaceRoot)

    expect(await repository.getLatest("routes", "development")).toBeNull()
    await repository.save(run())

    expect(await repository.getLatest("routes", "development")).toEqual(run())
  })

  it("rejects an environment that could escape the fixed runtime directory", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "myhub-store-"))
    temporaryDirectories.push(workspaceRoot)
    const repository = createFileHealthCheckResultRepository(workspaceRoot)

    await expect(repository.getLatest("routes", "../outside")).rejects.toThrow("Ambiente inválido")
  })
})
