import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import type { InstalledApp } from "../domain/app"
import { asCompanyId } from "../../companies/domain/company"
import { asMembershipId } from "../../memberships/domain/membership"
import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import { findAppDefinition } from "./app-registry"
import { authorizeAppAccess } from "./app-access.policy"

const companyId = asCompanyId("company-galaxia")
const products = findAppDefinition("products")!
const productInstall: InstalledApp = {
  companyId,
  appId: "products",
  status: "active",
  installedAt: "2026-06-01T12:00:00.000Z",
}

function context(
  permissions: SeumeiTenantContext["permissions"],
): SeumeiTenantContext {
  return {
    userId: asUserId("user-demo-seumei"),
    companyId,
    membershipId: asMembershipId("membership-demo-galaxia"),
    role: "member",
    permissions,
  }
}

describe("authorizeAppAccess", () => {
  it("rejects a capability that is not installed", () => {
    expect(
      authorizeAppAccess({
        context: context(["products.view"]),
        definition: products,
        installed: null,
      }),
    ).toEqual({ ok: false, error: "app-not-installed" })
  })

  it("rejects an installed capability without permission", () => {
    expect(
      authorizeAppAccess({
        context: context(["apps.view"]),
        definition: products,
        installed: productInstall,
      }),
    ).toEqual({ ok: false, error: "permission-denied" })
  })

  it("allows an active installed capability with permission", () => {
    expect(
      authorizeAppAccess({
        context: context(["products.view"]),
        definition: products,
        installed: productInstall,
      }),
    ).toEqual({ ok: true })
  })
})
