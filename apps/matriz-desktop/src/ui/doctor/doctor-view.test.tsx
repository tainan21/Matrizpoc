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
  it("renders actionable diagnostic metadata without executing a remedy", () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(<DoctorView checks={checks} refresh={refresh} />)

    expect(screen.getByRole("heading", { name: "DOCTOR" })).toBeVisible()
    expect(screen.getByText("1/2 prontos")).toBeVisible()
    expect(screen.getByText("Major 22")).toBeVisible()
    expect(screen.getByText("Ação disponível após prévia segura")).toBeVisible()
    expect(screen.queryByRole("button", { name: /corrigir/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Executar diagnóstico" }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
