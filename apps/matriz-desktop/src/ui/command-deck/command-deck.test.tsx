import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DeckCommand } from "../../application/command-deck"
import { CommandDeck } from "./command-deck"

afterEach(cleanup)

const commands: readonly DeckCommand[] = [
  { id: "terminal", label: "Nova sessão", keywords: ["terminal"], group: "Terminal", status: "pronto" },
  { id: "kill", label: "Liberar 3002", keywords: ["kill"], group: "Portas", status: "PID 7002", destructive: true },
]

describe("Matriz Command Deck", () => {
  it("opens with Ctrl K, supports arrows and restores focus after execution", () => {
    const execute = vi.fn().mockResolvedValue(undefined)
    render(<><button>Origem</button><CommandDeck commands={commands} execute={execute} /></>)
    screen.getByRole("button", { name: "Origem" }).focus()

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    expect(screen.getByRole("combobox", { name: "Buscar ações" })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" })
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowUp" })
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })

    expect(execute).toHaveBeenCalledWith("terminal")
    expect(screen.getByRole("button", { name: "Origem" })).toHaveFocus()
  })

  it("requires an explicit second confirmation for destructive actions", () => {
    const execute = vi.fn().mockResolvedValue(undefined)
    render(<CommandDeck commands={commands} execute={execute} />)
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    const input = screen.getByRole("combobox", { name: "Buscar ações" })
    fireEvent.change(input, { target: { value: "liberar" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(execute).not.toHaveBeenCalled()
    expect(screen.getByText("ENTER NOVAMENTE")).toBeVisible()
    fireEvent.keyDown(input, { key: "Enter" })
    expect(execute).toHaveBeenCalledWith("kill")
  })

  it("closes with Escape without executing", () => {
    const execute = vi.fn()
    render(<CommandDeck commands={commands} execute={execute} />)
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(execute).not.toHaveBeenCalled()
  })
})
