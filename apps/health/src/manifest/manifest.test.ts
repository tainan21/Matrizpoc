import { describe, expect, it } from "vitest"
import { appManifestSchema } from "@matriz/integration-api-contracts"
import { manifest } from "./manifest"

describe("Health manifest", () => {
  it("conforms to the public app manifest contract", () => {
    expect(appManifestSchema.safeParse(manifest).success).toBe(true)
    expect(manifest.primaryRoute).toBe("/")
  })
})
