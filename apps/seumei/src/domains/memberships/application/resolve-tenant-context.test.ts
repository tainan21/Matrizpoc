import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { asCompanyId } from "../../companies/domain/company"
import { createBusinessOsRepositories } from "../../../mock/business-os.repositories"
import { resolveTenantContext } from "./resolve-tenant-context"

describe("resolveTenantContext", () => {
  it("rejects a company with no authenticated membership", async () => {
    const demoUserId = asUserId("user-demo-seumei")
    const repos = createBusinessOsRepositories({ demoUserId })
    const result = await resolveTenantContext({
      userId: asUserId("user-outsider"),
      requestedCompanyId: asCompanyId("company-galaxia"),
      memberships: repos.memberships,
    })

    expect(result).toEqual({ ok: false, error: "membership-required" })
  })

  it("resolves the canonical demo membership", async () => {
    const demoUserId = asUserId("user-demo-seumei")
    const repos = createBusinessOsRepositories({ demoUserId })
    const result = await resolveTenantContext({
      userId: demoUserId,
      requestedCompanyId: asCompanyId("company-galaxia"),
      memberships: repos.memberships,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.context.companyId).toBe("company-galaxia")
    expect(result.context.role).toBe("owner")
  })
})
