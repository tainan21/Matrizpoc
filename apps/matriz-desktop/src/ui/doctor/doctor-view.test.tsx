import "@testing-library/jest-dom/vitest"

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { DoctorCheck } from "../../domain/types"
import { DoctorView } from "./doctor-view"

const checks: readonly DoctorCheck[] = [
  {
    id: "node",
    group: "Toolchain",
    label: "Node.js",
    ok: true,
    severity: "success",
    value: "v22.13.1",
    description: "Runtime JavaScript do workspace.",
    expected: "Major 22",
  },
  {
    id: "webview2",
    group: "Sistema",
    label: "WebView2",
    ok: false,
    severity: "error",
    value: "Não encontrado",
    description: "Renderer nativo do Control.",
    expected: "Runtime instalado",
    remedyId: "install-webview2",
  },
]

describe("DoctorView", () => {
  it("previews and confirms a fixed remedy before navigating", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    const previewRemedy = vi.fn().mockResolvedValue({
      remedyId: "install-webview2",
      title: "Configurar WebView2",
      summary: "Abra Ajustes para concluir a configuração.",
      target: "settings",
      confirmationToken: "doctor-token",
      expiresAt: Date.now() + 30_000,
    })
    const confirmRemedy = vi.fn().mockResolvedValue({ target: "settings" })
    const open = vi.fn()
    render(<DoctorView checks={checks} refresh={refresh} previewRemedy={previewRemedy} confirmRemedy={confirmRemedy} open={open} />)

    expect(screen.getByRole("heading", { name: "DOCTOR" })).toBeVisible()
    expect(screen.getByText("1/2 prontos")).toBeVisible()
    expect(screen.getByText("Major 22")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Revisar correção de WebView2" }))
    expect(await screen.findByText("Configurar WebView2")).toBeVisible()
    expect(previewRemedy).toHaveBeenCalledWith("install-webview2")

    fireEvent.click(screen.getByRole("button", { name: "Confirmar correção" }))
    expect(confirmRemedy).toHaveBeenCalledWith("doctor-token")
    expect(await screen.findByText("Correção encaminhada com segurança.")).toBeVisible()
    expect(open).toHaveBeenCalledWith("settings")

    fireEvent.click(screen.getByRole("button", { name: "Executar diagnóstico" }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
