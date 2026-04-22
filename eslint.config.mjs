/**
 * Matriz root ESLint flat config (V1.1).
 *
 * Enforces Architectural Laws L3/L4/L6/L12 via path-based import
 * restrictions using ESLint core's `no-restricted-imports` rule.
 *
 * Only depends on `@typescript-eslint/parser` (no plugin) so the config
 * stays light; tsc is the first line of defense, lint enforces boundaries.
 *
 * V1.1 additions covered here:
 *   - apps/*\/src/auth/** must not reach app domain internals (L12)
 *   - apps/*\/src/domains/<d>/presentation/** must not import raw
 *     domain models (L6)
 *   - apps/* cannot import from another app's src/** or app/** (L3/L4)
 *   - packages/platform/auth must stay domain-free and visual-free (L12)
 *
 * @type {import('eslint').Linter.Config[]}
 */
import tsparser from "@typescript-eslint/parser"

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.ts",
      "prisma/**",
      "tooling/scripts/**",
    ],
  },
  // ------------------------------------------------------------------
  // L3/L4 — apps are isolated. Only cross-app surface allowed is the
  // public-contract.ts manifest barrel or @matriz/integration-* packages.
  // ------------------------------------------------------------------
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/apps/*/src/**",
                "**/apps/*/app/**",
                "apps/*/src/**",
                "apps/*/app/**",
                "@apps/*/src/**",
                "@apps/*/app/**",
              ],
              message:
                "L3/L4: cross-app imports are forbidden. Use @apps/<app>/public-contract (manifest-only) or @matriz/integration-api-contracts.",
            },
          ],
        },
      ],
    },
  },
  // ------------------------------------------------------------------
  // L4 — packages cannot import from apps.
  // ------------------------------------------------------------------
  {
    files: ["packages/**/*.ts", "packages/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/apps/**", "@apps/**"],
              message:
                "L4: shared packages must never import from apps. Shared code must remain domain-free (L12).",
            },
          ],
        },
      ],
    },
  },
  // ------------------------------------------------------------------
  // L4 — design packages stay visual-only.
  // ------------------------------------------------------------------
  {
    files: ["packages/design/**/*.ts", "packages/design/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@matriz/integration-*",
                "@matriz/flows-*",
                "**/packages/integration/**",
                "**/packages/flows/**",
              ],
              message:
                "L4: design packages must not depend on integration or flows. Design is visual-only.",
            },
          ],
        },
      ],
    },
  },
  // ------------------------------------------------------------------
  // L4 — integration packages stay contract-only.
  // ------------------------------------------------------------------
  {
    files: ["packages/integration/**/*.ts", "packages/integration/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@matriz/design-*", "**/packages/design/**"],
              message:
                "L4: integration packages must not depend on design. Contracts are visual-agnostic.",
            },
          ],
        },
      ],
    },
  },
  // ------------------------------------------------------------------
  // L4 — foundation is the base layer.
  // ------------------------------------------------------------------
  {
    files: ["packages/foundation/**/*.ts", "packages/foundation/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@matriz/design-*",
                "@matriz/platform-*",
                "@matriz/access-*",
                "@matriz/integration-*",
                "@matriz/flows-*",
              ],
              message:
                "L4: foundation is the base layer. It cannot depend on any other shared package.",
            },
          ],
        },
      ],
    },
  },
  // ------------------------------------------------------------------
  // L12 — platform-auth must not carry app-specific domain. The package
  // cannot import from access-* (tenant-specific policy), flows-*,
  // integration-*, or design-*.
  // ------------------------------------------------------------------
  {
    files: ["packages/platform/auth/**/*.ts", "packages/platform/auth/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@matriz/access-*",
                "@matriz/flows-*",
                "@matriz/integration-*",
                "@matriz/design-*",
                "**/packages/access/**",
                "**/packages/flows/**",
                "**/packages/integration/**",
                "**/packages/design/**",
              ],
              message:
                "L12: platform-auth must remain domain-free and visual-free. Apps compose auth with access/tenants and design locally.",
            },
          ],
        },
      ],
    },
  },
  // ------------------------------------------------------------------
  // L6 — UI / presentation layers cannot import raw domain entities.
  // Covers BOTH the legacy src/ui/** and the new
  // src/domains/<d>/presentation/** structure.
  // ------------------------------------------------------------------
  {
    files: [
      "apps/*/src/ui/**/*.ts",
      "apps/*/src/ui/**/*.tsx",
      "apps/*/src/domains/*/presentation/**/*.ts",
      "apps/*/src/domains/*/presentation/**/*.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/domain/models/**",
                "**/domain/rules/**",
                "**/src/domain/models/**",
                "**/src/domain/rules/**",
                "**/domains/*/domain/models/**",
                "**/domains/*/domain/rules/**",
              ],
              message:
                "L6: UI/presentation must not import raw domain entities. Use presenters / view-models.",
            },
          ],
        },
      ],
    },
  },
  // ------------------------------------------------------------------
  // L12 — app auth adoption (src/auth/**) cannot reach into domain,
  // application, or mock layers. Adoption stays at framework wiring
  // level only.
  // ------------------------------------------------------------------
  {
    files: ["apps/*/src/auth/**/*.ts", "apps/*/src/auth/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/src/domain/**",
                "**/src/application/**",
                "**/src/mock/**",
                "**/domains/*/domain/**",
                "**/domains/*/application/**",
                "**/domains/*/mock/**",
              ],
              message:
                "Auth adoption (src/auth/**) must not import app domain/application/mock. Keep adoption framework-level.",
            },
          ],
        },
      ],
    },
  },
]
