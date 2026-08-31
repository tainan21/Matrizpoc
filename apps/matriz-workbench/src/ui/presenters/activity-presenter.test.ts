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

it("groups the activity timeline into human-readable calendar days", async () => {
  const presenter = await import("./activity-presenter")
  const groupActivityEventsByDay = (
    presenter as unknown as {
      groupActivityEventsByDay?: (events: ReturnType<typeof toActivityEventViewModel>[]) => Array<{ label: string; events: unknown[] }>
    }
  ).groupActivityEventsByDay

  expect(groupActivityEventsByDay).toBeTypeOf("function")
  if (!groupActivityEventsByDay) return

  const base: ActivityEvent = {
    schemaVersion: 1,
    id: "evt_11111111-1111-4111-8111-111111111111",
    projectId: "sample",
    actor: "human",
    action: "work.updated",
    summary: "Atualização",
    entityType: "backlog",
    entityId: "tsk_22222222-2222-4222-8222-222222222222",
    metadata: {},
    occurredAt: "2026-08-29T15:00:00.000Z",
  }
  const groups = groupActivityEventsByDay([
    toActivityEventViewModel(base),
    toActivityEventViewModel({ ...base, id: "evt_33333333-3333-4333-8333-333333333333", occurredAt: "2026-08-28T15:00:00.000Z" }),
  ])

  expect(groups.map((group) => group.label)).toEqual(["29 de agosto de 2026", "28 de agosto de 2026"])
  expect(groups.map((group) => group.events.length)).toEqual([1, 1])
})
