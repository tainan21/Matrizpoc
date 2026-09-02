import "@testing-library/jest-dom/vitest"

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { RuntimeInstance } from "../../domain/types"
import { AgentsView } from "./agents-view"

const workbench = (status: RuntimeInstance["status"]): RuntimeInstance => ({
  id: "matriz-workbench",
  label: "Workbench",
  port: 3005,
  status,
  ownership: status === "ready" ? "managed" : "none",
  endpoint: "http://127.0.0.1:3005",
  health: status === "ready" ? "healthy" : "offline",
})

describe("AgentsView", () => {
  it("starts the cataloged Workbench operation without duplicating its domain", async () => {
    const start = vi.fn().mockResolvedValue(undefined)
    render(<AgentsView runtimes={[workbench("stopped")]} start={start} open={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Iniciar Workbench" }))

    await waitFor(() => expect(start).toHaveBeenCalledWith("app.matriz-workbench.web"))
    expect(screen.getByText(/tarefas, aprovações e histórico continuam no Workbench/i)).toBeVisible()
  })

  it("opens the ready Workbench through the existing Apps surface", () => {
    const open = vi.fn()
    render(<AgentsView runtimes={[workbench("ready")]} start={vi.fn()} open={open} />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir Workbench" }))

    expect(open).toHaveBeenCalledTimes(1)
  })
})
