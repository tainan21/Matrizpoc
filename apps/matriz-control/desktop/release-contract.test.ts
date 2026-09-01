import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url))

describe("Matriz Control signed release contract", () => {
  it("keeps deterministic updater assets and a tag-gated release workflow", async () => {
    const [packageJsonText, workflow] = await Promise.all([
      readFile(new URL("apps/matriz-control/package.json", `file://${repositoryRoot.replace(/\\/g, "/")}/`), "utf8"),
      readFile(new URL(".github/workflows/matriz-control-windows-release.yml", `file://${repositoryRoot.replace(/\\/g, "/")}/`), "utf8"),
    ])

    const packageJson = JSON.parse(packageJsonText) as { scripts: Record<string, string>; build: { appId: string; artifactName: string; publish: { provider: string }[] } }

    expect(packageJson.scripts["desktop:release"]).toBe("pnpm run desktop:build")
    expect(packageJson.scripts["desktop:prepare-runtime"]).toBe("tsx desktop/prepare-packaged-runtime.ts")
    expect(packageJson.scripts["desktop:compile"]).toContain("esbuild desktop/windows-local-environment-resolver.ts")
    expect(packageJson.scripts["desktop:compile"]).toContain("--bundle --platform=node --format=cjs")
    expect(packageJson.scripts["desktop:build"]).toBe("pnpm run build && pnpm run desktop:prepare-runtime && pnpm run desktop:compile && electron-builder --win nsis --publish never")
    expect(packageJson.build.publish).toEqual(expect.arrayContaining([expect.objectContaining({ provider: "github" })]))
    expect(packageJson.build.appId).toBe("com.matriz.control.electron")
    expect(packageJson.build.artifactName).toBe("matriz-control-electron-${version}-windows-x64-setup.${ext}")
    expect(workflow).toContain('tags: ["control-electron-v*"]')
    expect(workflow).toContain('contents: write')
    expect(workflow).toContain('MATRIZ_CONTROL_WINDOWS_SIGNING_CERTIFICATE')
    expect(workflow).toContain('desktop:release')
    expect(workflow).toContain('Get-AuthenticodeSignature')
    expect(workflow).toContain('SHA256SUMS.txt')
    expect(workflow).toContain('matriz-control-electron-*-windows-x64-setup.exe.blockmap')
  })
})
