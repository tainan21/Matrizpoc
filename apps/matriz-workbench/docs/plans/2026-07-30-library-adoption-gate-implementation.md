# Library Adoption Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir e publicar via MCP um gate determinístico e read-only para adoção de packages federados, começando pela Matriz Lib UI.

**Architecture:** Uma política portátil em `.matriz/adoption-policies` declara regras e evidências. Um repository app-local lê essa política com limites e proteção de path; um application service combina a política com o contrato de package já projetado por `FederatedSourceRepository`. A UI e o MCP consomem somente o resultado compacto.

**Tech Stack:** TypeScript 5.6, Zod 3, Node.js filesystem promises, Next.js 16 App Router, MCP SDK, Vitest.

## Global Constraints

- Alterações de código ficam em `apps/matriz-workbench`.
- O único dado portátil fora do app é `.matriz/adoption-policies/matriz-lib-ui.json`.
- `C:\Apps\MatrizLibUiOficial` permanece read-only.
- Não instalar packages externos.
- Não adicionar filesystem, shell, build, pack ou publish à UI/MCP.
- GitHub Packages privado é o canal oficial futuro.
- Nenhum package começa aprovado.
- Toda nova função de produção nasce após um teste que falha pelo motivo esperado.
- Pontos 0–100 somente mudam após implementação, teste, MCP e evidência visual.

---

## File Map

- Create `apps/matriz-workbench/src/domain/library-adoption.ts`: schemas e tipos.
- Create `apps/matriz-workbench/src/domain/library-adoption.test.ts`: invariantes.
- Create `apps/matriz-workbench/src/integration/filesystem/library-adoption-policy-repository.ts`: leitura segura.
- Create `apps/matriz-workbench/src/integration/filesystem/library-adoption-policy-repository.test.ts`: missing, traversal, symlink e JSON inválido.
- Create `apps/matriz-workbench/src/application/library-adoption-readiness.ts`: evaluator puro.
- Create `apps/matriz-workbench/src/application/library-adoption-readiness.test.ts`: estados e critérios.
- Create `.matriz/adoption-policies/matriz-lib-ui.json`: política inicial.
- Modify `apps/matriz-workbench/app/(workspace)/knowledge/[sourceId]/page.tsx`: apresentação.
- Modify `apps/matriz-workbench/app/globals.css`: layout responsivo do gate.
- Modify `apps/matriz-workbench/src/mcp/server.ts`: tool read-only.
- Modify `apps/matriz-workbench/src/cli/verify-mcp.ts`: contrato executável.
- Modify `apps/matriz-workbench/docs/MCP.md`: exemplo da nova leitura.
- Modify `apps/matriz-workbench/docs/MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md`: ligar auditoria ao gate.
- Modify `apps/matriz-workbench/src/cli/sync-federated-plan-evidence.ts`: somente metas comprovadas.

---

### Task 1: Domain Contract

**Files:**
- Create: `apps/matriz-workbench/src/domain/library-adoption.ts`
- Create: `apps/matriz-workbench/src/domain/library-adoption.test.ts`

**Interfaces:**
- Consumes: `z` from Zod.
- Produces: `libraryAdoptionPolicySchema`, `LibraryAdoptionPolicy`, `PackageAdoptionRule`, `PackageAdoptionReadiness`.

- [ ] **Step 1: Write the failing schema tests**

```ts
import { describe, expect, it } from "vitest"
import { libraryAdoptionPolicySchema } from "./library-adoption"

const valid = {
  schemaVersion: 1,
  sourceId: "matriz-lib-ui",
  distribution: {
    channel: "github_packages",
    registry: "https://npm.pkg.github.com",
    coordinatedReleases: true,
  },
  packages: [{
    name: "@matriz/tokens",
    status: "candidate",
    allowedSubpaths: [".", "./css"],
    requiredChecks: ["build", "typecheck"],
    blockers: ["No coordinated release"],
    evidence: ["apps/matriz-workbench/docs/MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md"],
  }],
}

describe("libraryAdoptionPolicySchema", () => {
  it("accepts a bounded portable policy", () => {
    expect(libraryAdoptionPolicySchema.parse(valid).sourceId).toBe("matriz-lib-ui")
  })

  it.each([
    { ...valid, sourceId: "../outside" },
    { ...valid, distribution: { ...valid.distribution, registry: "file:C:/secret" } },
    { ...valid, packages: [{ ...valid.packages[0], allowedSubpaths: ["../src"] }] },
    { ...valid, packages: [{ ...valid.packages[0], evidence: ["C:/secret.md"] }] },
  ])("rejects non-portable input", (input) => {
    expect(() => libraryAdoptionPolicySchema.parse(input)).toThrow()
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
pnpm --filter @matriz/app-matriz-workbench test -- src/domain/library-adoption.test.ts
```

Expected: FAIL because `./library-adoption` does not exist.

- [ ] **Step 3: Implement the minimal schemas**

```ts
import { z } from "zod"

const sourceIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)
const packageNameSchema = z.string().regex(/^@[a-z0-9-]+\/[a-z0-9-]+$/)
const subpathSchema = z.string().refine(
  (value) => value === "." || /^\.\/[a-z0-9][a-z0-9-]*(\/[a-z0-9-]+)*$/.test(value),
)
const evidenceSchema = z.string().refine(
  (value) =>
    value.length <= 300 &&
    !value.includes("\\") &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    value.endsWith(".md"),
)

export const packageAdoptionRuleSchema = z.object({
  name: packageNameSchema,
  status: z.enum(["blocked", "candidate", "approved"]),
  allowedSubpaths: z.array(subpathSchema).max(50),
  requiredChecks: z.array(z.string().regex(/^[a-z0-9][a-z0-9:-]*$/)).max(30),
  blockers: z.array(z.string().trim().min(1).max(240)).max(30),
  evidence: z.array(evidenceSchema).max(30),
})

export const libraryAdoptionPolicySchema = z.object({
  schemaVersion: z.literal(1),
  sourceId: sourceIdSchema,
  distribution: z.object({
    channel: z.literal("github_packages"),
    registry: z.literal("https://npm.pkg.github.com"),
    coordinatedReleases: z.boolean(),
  }),
  packages: z.array(packageAdoptionRuleSchema).max(100),
})

export type LibraryAdoptionPolicy = z.infer<typeof libraryAdoptionPolicySchema>
export type PackageAdoptionRule = z.infer<typeof packageAdoptionRuleSchema>

export interface PackageAdoptionReadiness {
  sourceId: string
  packageName: string
  status: "not_configured" | PackageAdoptionRule["status"]
  ready: boolean
  satisfied: string[]
  missing: string[]
  blockers: string[]
  allowedSubpaths: string[]
  evidence: string[]
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the Step 2 command. Expected: 4 cases pass.

---

### Task 2: Safe Policy Repository

**Files:**
- Create: `apps/matriz-workbench/src/integration/filesystem/library-adoption-policy-repository.ts`
- Create: `apps/matriz-workbench/src/integration/filesystem/library-adoption-policy-repository.test.ts`
- Create: `.matriz/adoption-policies/matriz-lib-ui.json`

**Interfaces:**
- Consumes: `libraryAdoptionPolicySchema`.
- Produces: `LibraryAdoptionPolicyRepository.create(repositoryRoot)` and `getPolicy(sourceId): Promise<LibraryAdoptionPolicy | undefined>`.

- [ ] **Step 1: Write failing filesystem tests**

Use temporary roots and assert:

```ts
await expect(repository.getPolicy("missing-source")).resolves.toBeUndefined()
await expect(repository.getPolicy("../outside")).rejects.toMatchObject({
  code: "INVALID_PATH",
})
await expect(repository.getPolicy("matriz-lib-ui")).resolves.toMatchObject({
  sourceId: "matriz-lib-ui",
})
```

Create a symlink named `matriz-lib-ui.json` pointing outside the temp root and
assert `INVALID_PATH`. Write invalid JSON and assert `INVALID_DATA`.

- [ ] **Step 2: Run the test and verify RED**

```powershell
pnpm --filter @matriz/app-matriz-workbench test -- src/integration/filesystem/library-adoption-policy-repository.test.ts
```

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement bounded read-only loading**

Implementation rules:

```ts
const MAX_POLICY_BYTES = 256_000
const SOURCE_ID = /^[a-z0-9][a-z0-9-]*$/
```

`create()` resolves the repository root with `realpath`. `getPolicy()`:

1. validates `sourceId`;
2. builds `.matriz/adoption-policies/${sourceId}.json`;
3. returns `undefined` on `ENOENT`;
4. rejects symlinks with `lstat().isSymbolicLink()`;
5. validates size and file type;
6. checks resolved target is inside the policies directory;
7. parses JSON and Zod;
8. requires `policy.sourceId === sourceId`;
9. maps failures to `WorkspaceError`.

- [ ] **Step 4: Run the test and verify GREEN**

Run the Step 2 command. Expected: all repository cases pass.

- [ ] **Step 5: Add the initial policy**

Create rules for:

- `@matriz/tokens`: candidate, `.` and `./css`;
- `@matriz/themes`: blocked, `.` and `./provider`;
- `@matriz/primitives`: candidate, `.` and `./button`;
- `@matriz/ui`: candidate, `.` and `./stat-card`;
- `@matriz/blocks`: candidate, `./page-header`;
- `@matriz/product-ui`: blocked, no allowed subpaths.

Every rule requires `build` and `typecheck`. Evidence references the approved
audit and ADR. Blockers use the concrete findings recorded in those files.

---

### Task 3: Deterministic Readiness Service

**Files:**
- Create: `apps/matriz-workbench/src/application/library-adoption-readiness.ts`
- Create: `apps/matriz-workbench/src/application/library-adoption-readiness.test.ts`

**Interfaces:**
- Consumes: `RegisteredPackageSummary`, `LibraryAdoptionPolicy | undefined`, and a set of existing evidence paths.
- Produces:

```ts
export function evaluatePackageAdoption(input: {
  sourceId: string
  packageSummary: RegisteredPackageSummary
  policy?: LibraryAdoptionPolicy
  existingEvidence: ReadonlySet<string>
}): PackageAdoptionReadiness
```

- [ ] **Step 1: Write failing evaluator tests**

Hand-derive three cases:

1. missing policy → `not_configured`, `ready: false`;
2. candidate with missing export/check → entries `export:./css` and
   `check:typecheck` in `missing`;
3. approved with all exports/checks/evidence and no blocker → `ready: true`.

Add a fourth assertion proving that one blocker forces `ready: false`.

- [ ] **Step 2: Run the test and verify RED**

```powershell
pnpm --filter @matriz/app-matriz-workbench test -- src/application/library-adoption-readiness.test.ts
```

Expected: FAIL because `evaluatePackageAdoption` does not exist.

- [ ] **Step 3: Implement the pure evaluator**

The evaluator:

```ts
const missingExports = rule.allowedSubpaths
  .filter((item) => !packageSummary.exports.includes(item))
  .map((item) => `export:${item}`)
const missingChecks = rule.requiredChecks
  .filter((item) => !packageSummary.scripts.includes(item))
  .map((item) => `check:${item}`)
const missingEvidence = rule.evidence
  .filter((item) => !existingEvidence.has(item))
  .map((item) => `evidence:${item}`)
const missing = [...missingExports, ...missingChecks, ...missingEvidence]
const ready =
  rule.status === "approved" &&
  rule.blockers.length === 0 &&
  missing.length === 0
```

Return sorted arrays for deterministic MCP output.

- [ ] **Step 4: Run the test and verify GREEN**

Run the Step 2 command. Expected: all four behaviors pass.

- [ ] **Step 5: Add a composition function**

Export:

```ts
export async function getPackageAdoptionReadiness(
  repositoryRoot: string,
  federatedSources: FederatedSourceRepository,
  policies: LibraryAdoptionPolicyRepository,
  sourceId: string,
  packageName: string,
): Promise<PackageAdoptionReadiness>
```

It loads the package summary and policy, validates each evidence path with
`realpath`, rejects symlinks/outside paths and passes an existence set to the
pure evaluator.

Add an integration-style test with temp filesystem proving a missing evidence
file remains in `missing`.

---

### Task 4: UI and MCP Read Surface

**Files:**
- Modify: `apps/matriz-workbench/app/(workspace)/knowledge/[sourceId]/page.tsx`
- Modify: `apps/matriz-workbench/app/globals.css`
- Modify: `apps/matriz-workbench/src/mcp/server.ts`
- Modify: `apps/matriz-workbench/src/cli/verify-mcp.ts`

**Interfaces:**
- Consumes: `getPackageAdoptionReadiness`.
- Produces: package gate in Knowledge and tool `workbench_get_package_adoption_readiness`.

- [ ] **Step 1: Extend MCP verification first**

Call:

```ts
const readinessResult = await client.callTool({
  name: "workbench_get_package_adoption_readiness",
  arguments: {
    sourceId: "matriz-lib-ui",
    packageName: "@matriz/tokens",
  },
})
```

Assert:

```ts
readiness.status === "candidate"
readiness.ready === false
readiness.allowedSubpaths.includes("./css")
!("absolutePath" in readiness)
```

- [ ] **Step 2: Run MCP verification and verify RED**

```powershell
pnpm --filter @matriz/app-matriz-workbench verify:mcp
```

Expected: FAIL because the tool is not registered.

- [ ] **Step 3: Register the read-only MCP tool**

Input schema contains only `sourceId` and `packageName`. Annotations:

```ts
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
}
```

The handler calls the application service. Do not add a mutation tool.

- [ ] **Step 4: Run MCP verification and verify GREEN**

Run Step 2. Expected: tool list grows by one and the readiness assertions pass.

- [ ] **Step 5: Add the package gate to Knowledge**

When `?package=` is selected, load readiness next to the package summary and
render:

- state chip;
- “pronto para adoção” or “ainda não adotável”;
- allowed subpaths;
- missing criteria;
- blockers;
- evidence references.

Use `<section>`, `<dl>`, `<ul>` and existing semantic colors. Do not add a new
client component.

- [ ] **Step 6: Add responsive styles**

Desktop uses a two-column definition layout. At the existing mobile breakpoint
it becomes one column. Long package names and evidence paths use
`overflow-wrap: anywhere`.

---

### Task 5: Documentation, Evidence and Verification

**Files:**
- Modify: `apps/matriz-workbench/docs/MCP.md`
- Modify: `apps/matriz-workbench/docs/MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md`
- Modify: `apps/matriz-workbench/src/cli/sync-federated-plan-evidence.ts`
- Create: `output/playwright/10-library-adoption-gate-dark.png`
- Create: `output/playwright/11-library-adoption-gate-mobile-light.png`

**Interfaces:**
- Consumes: completed gate.
- Produces: operational documentation and observable score evidence.

- [ ] **Step 1: Document the MCP request and response**

Add a compact JSON example for
`workbench_get_package_adoption_readiness`, explain `candidate !== approved`
and state that the tool never executes checks.

- [ ] **Step 2: Link the audit to the live gate**

Record the initial six package states and the order:
tokens → primitives → UI → blocks → themes. Keep product-ui blocked.

- [ ] **Step 3: Add only matching score evidence**

Propose evidence only for goals whose wording exactly matches:

- a typed knowledge/adoption contract;
- safe read projection;
- MCP usage validation;
- documentation of reuse/evolution.

Do not score publication or physical consumption.

- [ ] **Step 4: Run scoped automated gates**

```powershell
pnpm --filter @matriz/app-matriz-workbench test -- src/domain/library-adoption.test.ts src/integration/filesystem/library-adoption-policy-repository.test.ts src/application/library-adoption-readiness.test.ts
pnpm --filter @matriz/app-matriz-workbench lint
pnpm --filter @matriz/app-matriz-workbench typecheck
pnpm --filter @matriz/app-matriz-workbench verify:mcp
pnpm --filter @matriz/app-matriz-workbench build
pnpm exec tsx tooling/scripts/verify-app-boundaries.ts
```

Expected: all commands exit 0.

- [ ] **Step 5: Verify the real UI**

Open:

```text
http://127.0.0.1:3005/knowledge/matriz-lib-ui?package=%40matriz%2Ftokens
```

Validate desktop dark and mobile light, keyboard focus, no console errors, and
capture the two screenshots named above.

- [ ] **Step 6: Synchronize evidence**

Run:

```powershell
pnpm --filter @matriz/app-matriz-workbench sync:federated-evidence
```

Report exact score deltas and explicitly retain zero for GitHub publication
and package consumption.

