import { describe, expect, it } from "vitest"
import {
  docsHumanStatus,
  docsStatusToHubStatus,
  presentDocsAction,
} from "./presenters"

describe("MatrizDocs operational language", () => {
  it("translates document state without hiding the technical term", () => {
    expect(docsHumanStatus("in_review")).toEqual({
      label: "Em revisão",
      technical: "in_review",
    })
    expect(docsStatusToHubStatus("in_review")).toBe("approval")
  })

  it("distinguishes published truth from temporary work", () => {
    expect(docsStatusToHubStatus("published")).toBe("official")
    expect(docsStatusToHubStatus("draft")).toBe("temporary")
    expect(docsStatusToHubStatus("archived")).toBe("archived")
  })

  it("teaches technical actions through a human verb and consequence", () => {
    expect(presentDocsAction("publish")).toEqual({
      label: "Disponibilizar oficialmente",
      technical: "Publish",
      consequence: "Cria uma versão oficial e auditável.",
    })
  })
})
