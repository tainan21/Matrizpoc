import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

export interface ApplicationBlueprintV1 {
  readonly schemaVersion: 1
  readonly operation: "create"
  readonly classification: "internal_monorepo_app"
  readonly slug: string
  readonly displayName: string
  readonly owner: string
  readonly boundedContext: string
  readonly preferredPort: number
}

export interface ScaffoldOperation {
  readonly path: string
  readonly content: string
  readonly contentHash: string
  readonly status: "create" | "skip-existing-identical" | "conflict-existing"
}

export interface ScaffoldPlan {
  readonly blueprint: ApplicationBlueprintV1
  readonly operations: readonly ScaffoldOperation[]
}

export function parseApplicationBlueprint(value: unknown): ApplicationBlueprintV1 {
  if (!value || typeof value !== "object") throw new Error("Blueprint must be an object.")
  const input = value as Record<string, unknown>
  if (input.schemaVersion !== 1 || input.operation !== "create" || input.classification !== "internal_monorepo_app") {
    throw new Error("Unsupported blueprint version, operation or classification.")
  }
  for (const field of ["slug", "displayName", "owner", "boundedContext"] as const) {
    if (typeof input[field] !== "string" || !input[field]) throw new Error(`Blueprint field "${field}" is required.`)
  }
  if (typeof input.preferredPort !== "number") throw new Error("Blueprint field \"preferredPort\" is required.")
  return input as unknown as ApplicationBlueprintV1
}

const hash = (content: string) => createHash("sha256").update(content).digest("hex")
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

function templateFiles(blueprint: ApplicationBlueprintV1): Record<string, string> {
  const { slug, displayName, owner, boundedContext, preferredPort } = blueprint
  return {
    "AGENTS.md": `# ${displayName}\n\nRead docs/AGENT-START-HERE.md before editing. Keep domain logic app-local and never import another app's src/** or app/**.\n`,
    "README.md": `# ${displayName}\n\n- **Responsibility:** ${boundedContext}\n- **Exposes:** public-contract.ts -> { manifest } only.\n- **Does not expose:** src/** or app/** internals.\n- **May import:** stable @matriz/* packages.\n- **Must not import:** another app's src/** or app/**.\n`,
    "docs/AGENT-START-HERE.md": `# ${displayName} — Agent Start Here\n\nRead src/manifest/manifest.ts, then src/bootstrap/index.ts. Ownership: ${owner}.\n`,
    "package.json": json({
      name: `@matriz/app-${slug}`,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: `next dev -H 127.0.0.1 -p ${preferredPort}`,
        build: "next build",
        start: `next start -H 127.0.0.1 -p ${preferredPort}`,
        lint: "eslint app src public-contract.ts --max-warnings 0",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@matriz/integration-api-contracts": "workspace:*",
        "@matriz/integration-registry-core": "workspace:*",
        "@matriz/platform-config": "workspace:*",
        next: "16.2.4",
        react: "19.2.5",
        "react-dom": "19.2.5",
      },
      devDependencies: {
        "@types/node": "22.7.5",
        "@types/react": "19.2.14",
        "@types/react-dom": "19.2.3",
        typescript: "5.6.3",
      },
    }),
    "public-contract.ts": `export { manifest } from "./src/manifest/manifest"\n`,
    "next-env.d.ts": `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`,
    "tsconfig.json": json({
      extends: "../../tooling/tsconfig/nextjs.json",
      compilerOptions: { baseUrl: ".", paths: { "@/*": ["./*"] } },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    }),
    "src/manifest/manifest.ts": `import type { AppManifestDTO } from "@matriz/integration-api-contracts"\n\nexport const manifest: AppManifestDTO = {\n  appId: "${slug}",\n  name: "${displayName}",\n  description: "${boundedContext}",\n  version: "0.1.0",\n  contractVersion: "v1",\n  primaryRoute: "/",\n  routes: [{ label: "Início", path: "/", order: 0 }],\n  capabilities: [{ id: "${slug}.home.read", name: "Abrir ${displayName}", description: "Exibe a superfície inicial do app." }],\n  eventsProduced: [],\n  eventsConsumed: [],\n  integrations: [],\n  onboardingSupport: { participates: true, hasSpecificStep: false },\n  navigationEntry: { label: "${displayName}", path: "/", order: 100 },\n  ownership: { domainSummary: "${boundedContext}", maintainers: ["${owner}"] },\n  widgets: [],\n}\n`,
    "src/bootstrap/index.ts": `import { getGlobalRegistry } from "@matriz/integration-registry-core"\nimport { monorepoConfig } from "@matriz/platform-config"\nimport { manifest } from "../manifest/manifest"\n\nlet booted = false\nexport function bootstrap${slug.replace(/(^|-)([a-z])/g, (_m, _dash, letter: string) => letter.toUpperCase())}() {\n  if (!booted) {\n    getGlobalRegistry().registerApp(manifest, { enabled: true, baseUrl: monorepoConfig.baseUrls[manifest.appId] })\n    booted = true\n  }\n  return { appId: manifest.appId }\n}\n`,
    "app/layout.tsx": `import type { ReactNode } from "react"\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return <html lang="pt-BR"><body>{children}</body></html>\n}\n`,
    "app/page.tsx": `export default function HomePage() {\n  return <main><h1>${displayName}</h1><p>${boundedContext}</p></main>\n}\n`,
    "app/api/health/route.ts": `import { manifest } from "../../../src/manifest/manifest"\n\nexport function GET(): Response {\n  return Response.json({ status: "ok", appId: manifest.appId, contractVersion: manifest.contractVersion })\n}\n`,
  }
}

export async function planApplicationScaffold(
  repositoryRoot: string,
  blueprint: ApplicationBlueprintV1,
): Promise<ScaffoldPlan> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(blueprint.slug)) throw new Error("Invalid blueprint slug.")
  if (!Number.isInteger(blueprint.preferredPort) || blueprint.preferredPort < 1024 || blueprint.preferredPort > 65535) {
    throw new Error("Invalid preferred port.")
  }
  const operations: ScaffoldOperation[] = []
  for (const [relative, content] of Object.entries(templateFiles(blueprint))) {
    const targetRelative = `apps/${blueprint.slug}/${relative}`
    const target = path.join(repositoryRoot, targetRelative)
    const existing = await readFile(target, "utf8").catch(() => undefined)
    operations.push({
      path: targetRelative,
      content,
      contentHash: hash(content),
      status: existing === undefined
        ? "create"
        : existing === content
          ? "skip-existing-identical"
          : "conflict-existing",
    })
  }
  return { blueprint, operations }
}
