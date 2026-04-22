// @ts-check
import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"

/**
 * Matriz root ESLint flat config.
 *
 * Enforces Architectural Law L4 — cross-app imports are restricted by path
 * patterns using `no-restricted-imports`. No app can reach into another
 * app's internals; only the manifest-only barrel (`public-contract.ts`) is
 * allowed as cross-app import.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
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
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // ------------------------------------------------------------------
  // L4 enforcement — app internals are private.
  // Files under apps/<app>/src/** and apps/<app>/app/** cannot import
  // from any OTHER apps/<x>/src/** or apps/<x>/app/**.
  // They MAY import `@apps/<x>/public-contract` (manifest-only barrel).
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
                "L3/L4: cross-app imports are forbidden. Use @apps/<app>/public-contract (manifest-only) or the public contracts in @matriz/integration-api-contracts.",
            },
          ],
        },
      ],
    },
  },
  // ------------------------------------------------------------------
  // L4 enforcement — packages cannot import from apps.
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
  // L4 enforcement — design packages must stay visual-only.
  // design/* cannot import integration/* or flows/*.
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
  // L4 enforcement — integration packages must stay contract-only.
  // integration/* cannot import design/*.
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
  // L4 enforcement — foundation is the base layer.
  // foundation/* cannot import any other @matriz/* package.
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
  // L6 enforcement — UI components cannot import domain entities directly.
  // They must go through presenters.
  // ------------------------------------------------------------------
  {
    files: ["apps/*/src/ui/**/*.ts", "apps/*/src/ui/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/domain/models/**", "**/domain/rules/**", "**/src/domain/models/**", "**/src/domain/rules/**"],
              message:
                "L6: UI must not import raw domain entities. Use presenters (src/ui/presenters/*) that produce ViewModels.",
            },
          ],
        },
      ],
    },
  },
]
