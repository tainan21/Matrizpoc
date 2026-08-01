import { expect, it } from "vitest"
import type { ActivityEvent } from "../../domain/schemas"
import { toActivityEventViewModel } from "./activity-presenter"

it("redacts local identity without mutating append-only activity", () => {
  const event: ActivityEvent = {
    schemaVersion: 1,
    id: "evt_11111111-1111-4111-8111-111111111111",
    projectId: "sample",
    actor: "codex",
    action: "codex.run.failed",
    summary: "Falhou em C:\\Users\\alice\\.codex\\config.toml",
    entityType: "agent_request",
    entityId: "req_22222222-2222-4222-8222-222222222222",
    metadata: {},
    occurredAt: "2026-07-29T00:00:00.000Z",
  }

  const view = toActivityEventViewModel(event)

  expect(view.summary).toBe("Falhou em %USERPROFILE%\\.codex\\config.toml")
  expect(event.summary).toContain("alice")
})
