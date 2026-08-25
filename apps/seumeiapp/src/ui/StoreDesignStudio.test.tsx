import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { STORE_IDENTITY_PRESETS } from "../domain/store-identity"
import { StoreDesignStudio } from "./StoreDesignStudio"

describe("StoreDesignStudio", () => {
  it("makes draft, preview and explicit publication understandable", () => {
    render(<StoreDesignStudio view={{ storeSlug: "galaxia-burger", displayName: "Galaxia Burger", preset: "COSMIC_DINER", headline: "Sabor de outro mundo", announcement: "Retirada em 20 minutos", description: "Smashes preparados com receitas conectadas.", heroImageUrl: "", draftVersion: 3, isPublished: true, statusLabel: "Publicado · versão 2", publicUrl: "/store/galaxia-burger", presets: STORE_IDENTITY_PRESETS }} />)
    expect(screen.getByRole("heading", { name: "Identidade da loja" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Cosmic Diner/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Abrir preview privado" })).toHaveAttribute("href", "/workspace/store/preview")
    expect(screen.getByRole("button", { name: "Publicar versão" })).toBeInTheDocument()
  })
})
