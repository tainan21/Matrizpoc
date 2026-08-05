import { describe, expect, it } from "vitest"
import type { AgentRequest, BacklogItem } from "../../domain/schemas"
import type { ProjectNavViewModel } from "./workspace-presenters"
import {
  toFocusAgentRequestViewModel,
  toFocusWorkItemViewModel,
} from "./focus-presenter"

const project: ProjectNavViewModel = {
  id: "matriz-workbench",
  displayName: "Matriz Workbench",
  initialized: true,
  corrupted: false,
}

const baseItem: BacklogItem = {
  schemaVersion: 1,
  id: "tsk_12345678-1234-1234-1234-123456abcdef",
  projectId: project.id,
  title: "Reduzir ruído da home",
  description: "",
  status: "in_progress",
  priority: "high",
  workScope: { kind: "project" },
  tags: [],
  acceptanceCriteria: [],
  dependencyIds: [],
  references: [],
  createdAt: "2026-08-04T12:00:00.000Z",
  updatedAt: "2026-08-04T12:00:00.000Z",
  revision: "revision-1",
}

const baseRequest: AgentRequest = {
  schemaVersion: 1,
  id: "req_12345678-1234-1234-1234-123456abcdef",
  projectId: project.id,
  backlogItemId: baseItem.id,
  title: "Executar reforma visual",
  instructions: "",
  status: "queued",
  changedFiles: [],
  checks: [],
  createdAt: "2026-08-04T12:00:00.000Z",
  updatedAt: "2026-08-04T12:00:00.000Z",
  revision: "revision-1",
}

describe("toFocusWorkItemViewModel", () => {
  it.each([
    ["in_progress", "Em andamento"],
    ["review", "Em revisão"],
  ] as const)("localiza o status %s", (status, expectedLabel) => {
    const viewModel = toFocusWorkItemViewModel({
      item: { ...baseItem, status },
      project,
    })

    expect(viewModel.statusLabel).toBe(expectedLabel)
  })

  it.each([
    ["critical", "Crítica"],
    ["high", "Alta"],
    ["medium", "Média"],
    ["low", "Baixa"],
  ] as const)("nomeia a prioridade %s", (priority, expectedLabel) => {
    const viewModel = toFocusWorkItemViewModel({
      item: { ...baseItem, priority },
      project,
    })

    expect(viewModel.priorityLabel).toBe(expectedLabel)
  })

  it("abrevia os seis caracteres finais e preserva o ID completo", () => {
    const viewModel = toFocusWorkItemViewModel({ item: baseItem, project })

    expect(viewModel.shortReference).toBe("tsk_…abcdef")
    expect(viewModel.fullReference).toBe(baseItem.id)
    expect(viewModel.projectLabel).toBe("Matriz Workbench")
  })
})

describe("toFocusAgentRequestViewModel", () => {
  it.each([
    ["queued", "Na fila"],
    ["claimed", "Assumida"],
    ["in_progress", "Em andamento"],
  ] as const)("localiza o status %s", (status, expectedLabel) => {
    const viewModel = toFocusAgentRequestViewModel({
      project,
      request: { ...baseRequest, status },
    })

    expect(viewModel.statusLabel).toBe(expectedLabel)
    expect(viewModel.projectLabel).toBe("Matriz Workbench")
  })
})

describe("isEditableShortcutTarget", () => {
  it("protege campos editáveis e mantém outros alvos disponíveis", async () => {
    const commandMenu = await import("../components/command-menu") as typeof import("../components/command-menu") & {
      isEditableShortcutTarget?: (target: EventTarget | null) => boolean
    }
    const guard = commandMenu.isEditableShortcutTarget

    expect(guard).toBeTypeOf("function")
    if (!guard) return

    expect(guard({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true)
    expect(guard({ tagName: "textarea" } as unknown as EventTarget)).toBe(true)
    expect(guard({ tagName: "Select" } as unknown as EventTarget)).toBe(true)
    expect(guard({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true)
    expect(guard({ tagName: "BUTTON", isContentEditable: false } as unknown as EventTarget)).toBe(false)
    expect(guard(null)).toBe(false)
  })
})
