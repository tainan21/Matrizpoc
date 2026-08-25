/**
 * Smoke contract — Matriz Lib public-style adoption.
 *
 * Guards app roots against private design package CSS paths and verifies that
 * every app adopts the versioned public CSS contract and HTML marker.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const apps = [
  { id: "matriz-hub", usesDesignUi: true },
  { id: "matrizlib", usesDesignUi: true },
  { id: "matriz-workbench", usesDesignUi: false },
  { id: "matriz-admin", usesDesignUi: true },
  { id: "seumeiapp", usesDesignUi: true },
  { id: "spot", usesDesignUi: true },
  { id: "contracts", usesDesignUi: true },
  { id: "willdash", usesDesignUi: true },
  { id: "sites", usesDesignUi: true },
] as const

function readAppFile(appId: string, file: "layout.tsx" | "globals.css") {
  return readFileSync(resolve(process.cwd(), "apps", appId, "app", file), "utf8")
}

const privateDesignCssImport =
  /@import\s+["'](?:[^"']*packages\/design\/[^"']*\/src\/|@matriz\/design-(?:system|ui)\/src\/)[^"']*\.css["'];/

function hasPrivateDesignCssImport(stylesheet: string) {
  return privateDesignCssImport.test(stylesheet)
}

describe("Matriz Lib public-style adoption", () => {
  it("loads design-system CSS through the public entry in every app", () => {
    for (const app of apps) {
      const stylesheet = readAppFile(app.id, "globals.css")
      expect(stylesheet, `${app.id} must import the public design-system CSS entry`).toMatch(
        /@import\s+["']@matriz\/design-system\/css["'];/,
      )
    }
  })

  it("uses the public design-ui stylesheet only in apps that consume its primitives", () => {
    for (const app of apps) {
      const stylesheet = readAppFile(app.id, "globals.css")
      const publicDesignUiImport = /@import\s+["']@matriz\/design-ui\/styles\.css["'];/

      if (app.usesDesignUi) {
        expect(stylesheet, `${app.id} must import the public design-ui stylesheet`).toMatch(
          publicDesignUiImport,
        )
      } else {
        expect(stylesheet, `${app.id} must remain token-only`).not.toMatch(publicDesignUiImport)
      }
    }
  })

  it("does not import CSS from private design package source paths", () => {
    for (const app of apps) {
      const stylesheet = readAppFile(app.id, "globals.css")
      expect(hasPrivateDesignCssImport(stylesheet), `${app.id} must use public CSS paths`).toBe(
        false,
      )
    }
  })

  it.each([
    '@import "../../../packages/design/ui/src/utility-shim.css";',
    '@import "@matriz/design-system/src/tokens.css";',
    '@import "@matriz/design-ui/src/utility-shim.css";',
  ])("detects a private design CSS import: %s", (stylesheet) => {
    expect(hasPrivateDesignCssImport(stylesheet)).toBe(true)
  })

  it("exposes the Matriz Lib version marker on every root html element", () => {
    for (const app of apps) {
      const layout = readAppFile(app.id, "layout.tsx")
      expect(layout, `${app.id} root html must expose the Matriz Lib version`).toMatch(
        /<html\b[^>]*\bdata-matrizlib=["']0\.1\.0["']/,
      )
    }
  })
})
