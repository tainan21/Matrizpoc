import * as React from "../../apps/matriz-workbench/node_modules/react/index.js"
import { renderToStaticMarkup } from "../../apps/matriz-workbench/node_modules/react-dom/server.node.js"
import { describe, expect, it, vi } from "vitest"
import * as ecosystemBarModule from "../../packages/design/ui/src/ecosystem-bar"
import { appThemes, darkAppThemes } from "../../packages/design/system/src/themes"

describe("shared design theme contract", () => {
  it("gives Matriz Admin an explicit product theme", () => {
    expect(appThemes["matriz-admin"]).toMatchObject({
      appId: "matriz-admin",
      label: "Matriz Admin",
    })
    expect(darkAppThemes["matriz-admin"].appId).toBe("matriz-admin")
  })

  it("defines a panel foreground fallback matching legacy surfaces", () => {
    const panelStyle = (
      ecosystemBarModule as typeof ecosystemBarModule & {
        ECOSYSTEM_PANEL_STYLE?: Record<string, string | number>
      }
    ).ECOSYSTEM_PANEL_STYLE

    expect(panelStyle?.color).toBe(
      "var(--color-foreground, var(--surface-fg, var(--text, #111827)))",
    )
  })

  it("renders InfoHint as a closed accessible disclosure before interaction", async () => {
    const modulePath = "../../apps/matriz-workbench/src/ui/components/info-hint"
    const infoHintModule = await vi.importActual<Record<string, unknown>>(modulePath).catch(() => undefined)
    expect(infoHintModule?.InfoHint).toBeTypeOf("function")

    Object.assign(globalThis, { React })
    const InfoHint = infoHintModule!.InfoHint as React.ComponentType<{
      label: string
      children: React.ReactNode
    }>
    const html = renderToStaticMarkup(React.createElement(
      InfoHint,
      { label: "Sobre o sistema visual" },
      "Explicação complementar",
    ))

    expect(html).toContain('aria-label="Sobre o sistema visual"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('role="tooltip"')
  })
})
