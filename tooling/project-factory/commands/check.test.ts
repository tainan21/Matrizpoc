import { describe, expect, it } from "vitest"
import { buildCheckInvocations } from "./check"

describe("app checks", () => {
  it("builds scoped lint, typecheck and boundary invocations", () => {
    expect(buildCheckInvocations("spot", "@matriz/app-spot", "C:/repo")).toEqual([
      { command: "pnpm", args: ["--filter", "@matriz/app-spot", "lint"], cwd: "C:/repo" },
      { command: "pnpm", args: ["--filter", "@matriz/app-spot", "typecheck"], cwd: "C:/repo" },
      { command: "pnpm", args: ["exec", "tsx", "tooling/scripts/verify-app-boundaries.ts", "spot"], cwd: "C:/repo" },
    ])
  })
})
