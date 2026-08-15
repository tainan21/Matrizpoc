import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const source = readFileSync(
  fileURLToPath(new URL("./theme-system-picker.tsx", import.meta.url)),
  "utf8",
)

describe("ThemeSystemPicker MatrizLib compatibility", () => {
  it("shows public token compatibility without replacing the local theme engine", () => {
    expect(source).toContain('from "@matriz/design-system"')
    expect(source).toContain("matrizTokenContract")
    expect(source).toContain("matrizTokenMetadata")
    expect(source).toContain("MatrizLib compativel")
    expect(source).not.toContain("@matriz/design-ui")
    expect(source).toContain("THEME_SYSTEM_COOKIE")
    expect(source).toContain("WORKBENCH_THEME_PRESETS")
  })
})
