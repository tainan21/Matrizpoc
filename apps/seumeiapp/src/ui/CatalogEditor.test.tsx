import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CatalogEditor } from "./CatalogEditor"
describe("CatalogEditor", () => {
  it("starts with one honest simple variant and category creation", () => {
    render(<CatalogEditor categories={[]} />)
    expect(screen.getByRole("heading", { name: "Novo produto" })).toBeInTheDocument()
    expect(screen.getByLabelText("Preço")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Criar categoria" })).toBeInTheDocument()
  })
})
