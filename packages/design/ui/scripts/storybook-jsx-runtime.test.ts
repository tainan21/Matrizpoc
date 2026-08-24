import { describe, expect, it } from "vitest"

import storybookConfig from "../.storybook/main"

describe("Storybook JSX runtime", () => {
  it("uses Vite's automatic React transform for sources without a default React import", async () => {
    expect(storybookConfig.viteFinal).toBeTypeOf("function")

    const viteFinal = storybookConfig.viteFinal
    if (!viteFinal) throw new Error("Storybook must configure Vite's JSX runtime")

    const config = await viteFinal({} as Parameters<typeof viteFinal>[0])
    expect(config.esbuild).toMatchObject({ jsx: "automatic" })
  })
})
