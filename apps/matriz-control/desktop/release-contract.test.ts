import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url))

describe("Matriz Control signed release contract", () => {
  it("keeps deterministic updater assets and a tag-gated release workflow", async () => {
    const [packageJson, workflow] = await Promise.all([
      readFile(new URL("apps/matriz-control/package.json", `file://${repositoryRoot.replace(/\\/g, "/")}/`), "utf8"),
      readFile(new URL(".github/workflows/matriz-control-windows-release.yml", `file://${repositoryRoot.replace(/\\/g, "/")}/`), "utf8"),
    ])

    expect(packageJson).toContain('"desktop:release"')
    expect(packageJson).toContain('"provider": "github"')
    expect(packageJson).toContain('"artifactName": "matriz-control-electron-${version}-windows-x64-setup.${ext}"')
    expect(workflow).toContain('tags: ["control-v*"]')
    expect(workflow).toContain('contents: write')
    expect(workflow).toContain('MATRIZ_CONTROL_WINDOWS_SIGNING_CERTIFICATE')
    expect(workflow).toContain('desktop:release')
    expect(workflow).toContain('Get-AuthenticodeSignature')
    expect(workflow).toContain('SHA256SUMS.txt')
    expect(workflow).toContain('matriz-control-*-windows-x64-setup.exe.blockmap')
  })
})
