import "@testing-library/jest-dom/vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { matrizTokenContract, matrizTokenMetadata } from "@matriz/design-system"
import { describe, expect, it } from "vitest"

import { ThemeSystemPicker } from "./theme-system-picker"

const workbenchPackage = JSON.parse(readFileSync(
  resolve(process.cwd(), "package.json"),
  "utf8",
)) as { dependencies: Record<string, string> }

describe("ThemeSystemPicker", () => {
  it("shows the public MatrizLib compatibility contract and keeps local preset selection interactive", () => {
    render(<ThemeSystemPicker variant="gallery" />)

    const compatibility = screen.getByLabelText("Compatibilidade MatrizLib")
    const semanticTokenCount = matrizTokenMetadata.filter((token) => token.layer === "semantic").length
    expect(compatibility).toHaveTextContent("MatrizLib compativel")
    expect(compatibility).toHaveTextContent(
      `Contrato publico v${matrizTokenContract.version} com ${semanticTokenCount} tokens semanticos.`,
    )
    expect(compatibility).toHaveTextContent("--matriz-color-action to --wb-accent")

    fireEvent.click(screen.getByRole("button", { name: /Aurora/ }))

    expect(document.documentElement.dataset.system).toBe("aurora")
    expect(document.documentElement.style.getPropertyValue("--matriz-color-action")).toBe("#08b8d6")
    expect(screen.getByRole("button", { name: /Aurora/ })).toHaveAttribute("aria-pressed", "true")
  })

  it("keeps the Workbench runtime boundary token-only", () => {
    expect(workbenchPackage.dependencies["@matriz/design-ui"]).toBeUndefined()
    expect(workbenchPackage.dependencies["@matriz/design-system"]).toBeDefined()
  })
})
