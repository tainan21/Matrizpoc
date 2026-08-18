import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import ComponentPage, { generateStaticParams } from "./page"

afterEach(cleanup)

describe("ComponentPage", () => {
  it("generates one static path for every audited component", () => {
    const params = generateStaticParams()

    expect(params).toHaveLength(99)
    expect(params).toContainEqual({ slug: "button" })
    expect(params).toContainEqual({ slug: "tenant-switcher" })
  })

  it("renders a known component detail", async () => {
    const page = await ComponentPage({ params: Promise.resolve({ slug: "button" }) })

    render(page)

    expect(screen.getByRole("heading", { level: 1, name: "Button" })).toBeVisible()
    expect(screen.getByRole("region", { name: "Preview ao vivo de Button" })).toBeVisible()
  })

  it("delegates an unknown slug to the real Next.js not-found boundary", async () => {
    await expect(
      ComponentPage({ params: Promise.resolve({ slug: "nao-existe" }) }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" })
  })
})
