import { access, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "vitest"
import { materializeStandaloneNodeModules, preparePackagedRuntime, readPnpmMajor, resolvePnpmDeployInvocation, resolvePnpmInvocation } from "./prepare-packaged-runtime"

const temporaryDirectories: string[] = []

async function writePackage(nodeModules: string, packageName: string) {
  const packageDirectory = join(nodeModules, ...packageName.split("/"))
  await mkdir(packageDirectory, { recursive: true })
  await writeFile(join(packageDirectory, "package.json"), JSON.stringify({ name: packageName }))
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("materializeStandaloneNodeModules", () => {
  it("replaces standalone package links with dereferenced runtime directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "matriz-control-runtime-"))
    temporaryDirectories.push(root)
    const deployedNodeModules = join(root, "deployed", "node_modules")
    const standaloneNodeModules = join(root, "standalone", "node_modules")
    const packageNames = ["next", "@next/env", "@swc/helpers", "react"]

    await Promise.all(packageNames.map((packageName) => writePackage(deployedNodeModules, packageName)))
    await mkdir(standaloneNodeModules, { recursive: true })
    await Promise.all([
      symlink(join(deployedNodeModules, "next"), join(standaloneNodeModules, "next"), "junction"),
      symlink(join(deployedNodeModules, "@next"), join(standaloneNodeModules, "@next"), "junction"),
      symlink(join(deployedNodeModules, "@swc"), join(standaloneNodeModules, "@swc"), "junction"),
      symlink(join(deployedNodeModules, "react"), join(standaloneNodeModules, "react"), "junction"),
    ])
    await writeFile(join(standaloneNodeModules, "obsolete-runtime-file"), "old")

    await materializeStandaloneNodeModules({ deployedNodeModules, standaloneNodeModules })

    for (const packageName of packageNames) {
      const packageDirectory = join(standaloneNodeModules, ...packageName.split("/"))
      expect((await lstat(packageDirectory)).isSymbolicLink()).toBe(false)
      await expect(readFile(join(packageDirectory, "package.json"), "utf8")).resolves.toContain(`\"name\":\"${packageName}\"`)
    }
    await expect(access(join(standaloneNodeModules, "obsolete-runtime-file"))).rejects.toThrow()
  })

  it("rejects a deployed runtime missing a required package", async () => {
    const root = await mkdtemp(join(tmpdir(), "matriz-control-runtime-"))
    temporaryDirectories.push(root)
    const deployedNodeModules = join(root, "deployed", "node_modules")

    await Promise.all(["next", "@next/env", "@swc/helpers"].map((packageName) => writePackage(deployedNodeModules, packageName)))

    await expect(materializeStandaloneNodeModules({ deployedNodeModules, standaloneNodeModules: join(root, "standalone", "node_modules") })).rejects.toThrow(/react/)
  })

  it("rejects a deployed runtime whose package metadata names the wrong package", async () => {
    const root = await mkdtemp(join(tmpdir(), "matriz-control-runtime-"))
    temporaryDirectories.push(root)
    const deployedNodeModules = join(root, "deployed", "node_modules")

    await Promise.all(["next", "@next/env", "@swc/helpers", "react"].map((packageName) => writePackage(deployedNodeModules, packageName)))
    await writeFile(join(deployedNodeModules, "react", "package.json"), JSON.stringify({ name: "not-react" }))

    await expect(materializeStandaloneNodeModules({ deployedNodeModules, standaloneNodeModules: join(root, "standalone", "node_modules") })).rejects.toThrow(/react/)
  })
})

describe("resolvePnpmInvocation", () => {
  it("runs a JavaScript pnpm entrypoint with Node but preserves the Windows pnpm executable", () => {
    expect(resolvePnpmInvocation("C:/pnpm/bin/pnpm.cjs")).toEqual({ command: process.execPath, args: ["C:/pnpm/bin/pnpm.cjs"] })
    expect(resolvePnpmInvocation("C:/Users/matriz/AppData/Local/pnpm/pnpm.exe")).toEqual({ command: "C:/Users/matriz/AppData/Local/pnpm/pnpm.exe", args: [] })
  })
})

describe("resolvePnpmDeployInvocation", () => {
  it("omits legacy deployment mode for pnpm 9", () => {
    expect(resolvePnpmDeployInvocation("C:/pnpm/bin/pnpm.cjs", 9, "C:/workspace", "C:/temp/runtime")).toEqual({
      command: process.execPath,
      args: ["C:/pnpm/bin/pnpm.cjs", "--config.node-linker=hoisted", "--filter", "@matriz/app-matriz-control", "deploy", "--prod", "C:/temp/runtime"],
      cwd: "C:/workspace",
    })
  })

  it("uses legacy deployment mode for pnpm 10", () => {
    expect(resolvePnpmDeployInvocation("C:/pnpm/bin/pnpm.cjs", 10, "C:/workspace", "C:/temp/runtime").args).toContain("--legacy")
  })
})

describe("readPnpmMajor", () => {
  it("parses the version from the same pnpm invocation without a shell", async () => {
    await expect(readPnpmMajor("C:/pnpm/bin/pnpm.cjs", async (command, args) => {
      expect(command).toBe(process.execPath)
      expect(args).toEqual(["C:/pnpm/bin/pnpm.cjs", "--version"])
      return "10.4.1\n"
    })).resolves.toBe(10)
  })
})

describe("preparePackagedRuntime", () => {
  it.each(["deploy", "copy"])("cleans its temporary deployment directory when %s fails", async (failure) => {
    const removed: string[] = []
    const deployRuntime = async () => {
      if (failure === "deploy") throw new Error("deploy failed")
    }
    const materializeRuntime = async () => {
      if (failure === "copy") throw new Error("copy failed")
    }

    await expect(preparePackagedRuntime({
      appDirectory: "C:/workspace/apps/matriz-control",
      createTemporaryDirectory: async () => "C:/temp/matriz-control-runtime",
      removeDirectory: async (directory) => { removed.push(directory) },
      deployRuntime,
      materializeRuntime,
    })).rejects.toThrow(`${failure} failed`)

    expect(removed).toEqual(["C:/temp/matriz-control-runtime"])
  })
})
