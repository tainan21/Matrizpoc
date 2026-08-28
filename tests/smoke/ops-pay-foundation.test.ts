import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { appManifestSchema } from "@matriz/integration-api-contracts"
import {
  moneyAmountSchema,
  walletAdjustmentInputSchema,
} from "@matriz/integration-wallet-contracts"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest as opsManifest } from "@apps/matriz-ops/public-contract"
import { manifest as payManifest } from "@apps/matriz-pay/public-contract"

describe("Matriz Ops + Pay foundation", () => {
  it("registers independent runtimes without changing Matriz Admin", () => {
    expect(monorepoConfig.baseUrls["matriz-admin"]).toBe("http://127.0.0.1:3002")
    expect(monorepoConfig.baseUrls["matriz-ops"]).toBe("http://127.0.0.1:3009")
    expect(monorepoConfig.baseUrls["matriz-pay"]).toBe("http://127.0.0.1:3010")
    expect(monorepoConfig.baseUrls["matriz-control"]).toBe("http://127.0.0.1:3011")
  })

  it("publishes valid, separate manifests", () => {
    expect(appManifestSchema.parse(opsManifest).appId).toBe("matriz-ops")
    expect(appManifestSchema.parse(payManifest).appId).toBe("matriz-pay")
    expect(opsManifest.integrations).toEqual(
      expect.arrayContaining([expect.objectContaining({ targetAppId: "matriz-pay" })]),
    )
  })

  it("represents money only in integer minor units serialized as strings", () => {
    expect(moneyAmountSchema.parse({ currency: "BRL", amountMinor: "1250" })).toEqual({
      currency: "BRL",
      amountMinor: "1250",
    })
    expect(() => moneyAmountSchema.parse({ currency: "BRL", amountMinor: "12.50" })).toThrow()
    expect(() => moneyAmountSchema.parse({ currency: "USD", amountMinor: "100" })).toThrow()
    expect(
      walletAdjustmentInputSchema.parse({
        amount: { currency: "MTRZ", amountMinor: "100" },
        direction: "CREDIT",
        reason: "Crédito de atendimento",
        correlationId: "corr_12345678",
      }),
    ).toBeTruthy()
  })

  it.each(["ops", "pay"])("keeps the %s Prisma schema independent", (schema) => {
    const source = readFileSync(join(process.cwd(), "prisma", schema, "schema.prisma"), "utf8")
    expect(source).toContain(`env("${schema.toUpperCase()}_DATABASE_URL")`)
    expect(source).toContain(`.prisma/${schema}`)
  })

  it("documents runtime and provider configuration without secrets", () => {
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8")
    for (const name of [
      "OPS_DATABASE_URL",
      "PAY_DATABASE_URL",
      "MATRIZ_OPS_OWNER_EMAIL",
      "MATRIZ_RUNTIME_PROFILE",
      "MATRIZ_PUBLIC_TUNNEL_URL",
      "CELCOIN_CLIENT_ID",
      "CELCOIN_CLIENT_SECRET",
    ]) {
      expect(example).toContain(`${name}=`)
    }
  })

  it("uses a per-request CSP nonce so Next hydration remains functional", () => {
    const proxy = readFileSync(join(process.cwd(), "apps", "matriz-ops", "proxy.ts"), "utf8")
    const config = readFileSync(join(process.cwd(), "apps", "matriz-ops", "next.config.mjs"), "utf8")
    expect(proxy).toContain("nonce-")
    expect(proxy).toContain("strict-dynamic")
    expect(proxy).toContain("crypto.randomUUID")
    expect(config).not.toContain("script-src 'self'")
  })
})
