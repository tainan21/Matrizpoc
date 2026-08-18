import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../application/desktop-gateway"
import { ControlApp } from "./app"

afterEach(cleanup)

function gateway(): DesktopGateway {
  return {
    snapshot: vi.fn().mockResolvedValue({
      snapshotId: "observed",
      ports: [{ port: 3000, pid: 3210, processName: "next.exe", state: "ready" }],
    }),
    kill: vi.fn().mockResolvedValue({ snapshotId: "next", ports: [] }),
    killMany: vi.fn().mockResolvedValue({ snapshotId: "next", ports: [] }),
    startApp: vi.fn().mockResolvedValue(undefined),
    stopApp: vi.fn().mockResolvedValue(undefined),
    appStatuses: vi.fn().mockResolvedValue([]),
    runGate: vi.fn().mockResolvedValue({
      gateId: "lint",
      success: true,
      durationMs: 1,
      output: [],
    }),
    openTarget: vi.fn().mockResolvedValue(undefined),
    selectWorkspace: vi.fn().mockResolvedValue("C:\\Apps\\matriz-infra-hub"),
    doctor: vi.fn().mockResolvedValue([]),
    workspacePulse: vi.fn().mockResolvedValue({ branch: "main", changedFiles: 0, clean: true }),
    readSettings: vi.fn().mockResolvedValue({
      closeToTray: true,
      soundsEnabled: false,
      volume: 0.45,
      startWithWindows: false,
    }),
    writeSettings: vi.fn().mockImplementation(async (settings) => settings),
    hide: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
  }
}

describe("Matriz Control", () => {
  it("kills the exact observed process in one action", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)

    expect(await screen.findByText("3000")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Encerrar PID 3210" }))

    await waitFor(() =>
      expect(desktop.kill).toHaveBeenCalledWith({ pid: 3210, snapshotId: "observed" }),
    )
  })

  it("keeps all primary modes keyboard reachable", async () => {
    render(<ControlApp gateway={gateway()} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")
    for (const label of ["Portas", "Apps", "Ações", "Doctor", "Ajustes"]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible()
    }
  })
})
