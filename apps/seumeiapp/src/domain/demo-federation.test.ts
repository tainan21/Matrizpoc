import { describe, expect, it } from "vitest"
import { DEMO_FEDERATION, requireDemoProvisioning } from "./demo-federation"

describe("demo federation identities", () => {
  it("defines two companies and grants the operator only Galaxia Burger", () => {
    expect(DEMO_FEDERATION.companies.map((company) => company.slug)).toEqual([
      "galaxia-burger",
      "sabor-e-brasa",
    ])
    expect(DEMO_FEDERATION.global.email).toBe("demo.global@matriz.local")
    expect(DEMO_FEDERATION.operator.email).toBe("operacao@galaxiaburger.demo")
    expect(DEMO_FEDERATION.operator.companySlugs).toEqual(["galaxia-burger"])
  })

  it("refuses provisioning unless demo mode is explicitly enabled", () => {
    expect(() => requireDemoProvisioning({})).toThrowError("DEMO_PROVISIONING_DISABLED")
    expect(() => requireDemoProvisioning({ MATRIZ_DEMO_PROVISIONING: "false" })).toThrowError(
      "DEMO_PROVISIONING_DISABLED",
    )
    expect(requireDemoProvisioning({ MATRIZ_DEMO_PROVISIONING: "true" })).toBeUndefined()
  })
})
