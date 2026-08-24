import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { asCompanyId } from "../domains/companies/domain/company"
import { resolveTenantContext } from "../domains/memberships/application/resolve-tenant-context"
import { createBusinessOsRepositories } from "./business-os.repositories"

const demoUserId = asUserId("user-demo-seumei")

describe("fixture business OS repositories", () => {
  it("never returns Matriz Labs apps in a Galáxia Burger context", async () => {
    const repos = createBusinessOsRepositories({ demoUserId })
    const resolution = await resolveTenantContext({
      userId: demoUserId,
      requestedCompanyId: asCompanyId("company-galaxia"),
      memberships: repos.memberships,
    })

    expect(resolution.ok).toBe(true)
    if (!resolution.ok) return
    const apps = await repos.installedApps.list(resolution.context)

    expect(apps.every((app) => app.companyId === resolution.context.companyId)).toBe(true)
    expect(apps.map((app) => app.appId)).toContain("store")
    expect(apps.map((app) => app.appId)).not.toContain("reports")
  })

  it("never returns Galáxia Burger apps in a Matriz Labs context", async () => {
    const repos = createBusinessOsRepositories({ demoUserId })
    const resolution = await resolveTenantContext({
      userId: demoUserId,
      requestedCompanyId: asCompanyId("company-matriz-labs"),
      memberships: repos.memberships,
    })

    expect(resolution.ok).toBe(true)
    if (!resolution.ok) return
    const apps = await repos.installedApps.list(resolution.context)

    expect(apps.map((app) => app.appId)).toContain("reports")
    expect(apps.map((app) => app.appId)).not.toContain("store")
  })
})
