import { describe, expect, it } from "vitest"
import { z } from "zod"
import { WorkspaceError } from "../../domain/errors"
import { apiError } from "./api-error"

describe("apiError", () => {
  it("keeps domain errors actionable without exposing unknown exceptions", async () => {
    const domain = apiError(new WorkspaceError("Conflito.", "CONFLICT"))
    expect(domain.status).toBe(409)
    await expect(domain.json()).resolves.toEqual({
      error: "Conflito.",
      code: "CONFLICT",
    })

    const unknown = apiError(new Error("token=must-not-leak"))
    expect(unknown.status).toBe(500)
    await expect(unknown.json()).resolves.toEqual({
      error: "Falha interna no Workbench.",
    })
  })

  it("maps runtime validation failures to a stable client response", async () => {
    const validation = z.string().min(3).safeParse("x")
    if (validation.success) throw new Error("Expected validation failure")

    const response = apiError(validation.error)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Dados da requisição inválidos.",
      code: "INVALID_DATA",
    })
  })
})
