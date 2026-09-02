import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import { UpdatePanel } from "./update-panel"

describe("UpdatePanel", () => {
  it("checks explicitly and installs only after download and confirmation", async () => {
    const gateway = {
      checkUpdate: vi.fn().mockResolvedValue({
        state: "available",
        currentVersion: "1.0.0",
        version: "1.1.0",
        notes: "Estabilidade instalada.",
        sizeBytes: 2048,
      }),
      downloadUpdate: vi.fn().mockImplementation(async (listener) => {
        listener({ downloadedBytes: 2048, totalBytes: 2048 })
        return {
          state: "downloaded",
          currentVersion: "1.0.0",
          version: "1.1.0",
          notes: "Estabilidade instalada.",
          sizeBytes: 2048,
        }
      }),
      installUpdate: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway
    const confirm = vi.fn().mockReturnValue(true)
    render(<UpdatePanel gateway={gateway} confirmInstall={confirm} />)

    expect(gateway.checkUpdate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Verificar atualizações" }))
    expect(await screen.findByText("1.1.0 disponível")).toBeInTheDocument()
    expect(gateway.installUpdate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Baixar atualização" }))
    await screen.findByRole("button", { name: "Instalar e reiniciar" })
    fireEvent.click(screen.getByRole("button", { name: "Instalar e reiniciar" }))

    await waitFor(() => expect(gateway.installUpdate).toHaveBeenCalledTimes(1))
    expect(confirm).toHaveBeenCalledWith("Instalar Matriz Control 1.1.0 e reiniciar agora?")
  })

  it("keeps the shell usable when the feed is unavailable", async () => {
    const gateway = {
      checkUpdate: vi.fn().mockRejectedValue(new Error("feed offline")),
    } as unknown as DesktopGateway
    render(<UpdatePanel gateway={gateway} />)
    fireEvent.click(screen.getByRole("button", { name: "Verificar atualizações" }))
    expect(await screen.findByText("Não foi possível verificar atualizações.")).toBeInTheDocument()
  })
})
