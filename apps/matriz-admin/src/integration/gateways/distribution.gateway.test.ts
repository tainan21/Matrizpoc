import { describe, expect, it } from "vitest"
import { DistributionAdminGateway } from "./distribution.gateway"

describe("DistributionAdminGateway", () => {
  it("sends authenticated idempotent product commands to the Hub contract", async () => {
    const requests: Request[] = []
    const gateway = new DistributionAdminGateway({
      baseUrl: "http://hub.test",
      token: "0123456789abcdef",
      fetch: async (input, init) => {
        const request = new Request(input, init); requests.push(request)
        return Response.json({
          productId: "matriz-pay", displayName: "Matriz Pay", edition: "Web", runtime: "web",
          platform: "win32", arch: "x64", state: "active", release: null,
          windows: { uninstallKey: "Matriz Pay", displayName: "Matriz Pay", publisher: "Matriz", executableName: "Matriz Pay.exe", aliases: [] },
        })
      },
    })
    await gateway.createProduct({
      productId: "matriz-pay", displayName: "Matriz Pay", edition: "Web", runtime: "web", platform: "win32", arch: "x64",
      windows: { uninstallKey: "Matriz Pay", displayName: "Matriz Pay", publisher: "Matriz", executableName: "Matriz Pay.exe", aliases: [] },
    }, "create-matriz-pay")

    expect(requests[0]?.url).toBe("http://hub.test/api/v1/distribution/admin/products")
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer 0123456789abcdef")
    expect(requests[0]?.headers.get("idempotency-key")).toBe("create-matriz-pay")
  })
})
