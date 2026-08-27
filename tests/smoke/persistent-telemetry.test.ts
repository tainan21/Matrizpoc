import { describe, expect, it, vi } from "vitest"
import { asTenantId } from "@matriz/foundation-types"
import { createHttpTelemetrySink, createTelemetryClient } from "@matriz/platform-telemetry"

describe("persistent telemetry transport", () => {
  it("batches envelopes into the authenticated Hub ingestion endpoint", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 202 }))
    const sink = createHttpTelemetrySink({ endpoint: "https://hub.example/api/v1/telemetry/batches", token: "service-token", fetcher })
    const client = createTelemetryClient("matriz-ops", { sink })
    client.track({ tenantId: asTenantId("tenant_1"), type: "navigation", properties: { route: "/users", durationMs: 12 } })
    await client.flush()

    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledWith("https://hub.example/api/v1/telemetry/batches", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer service-token" }),
    }))
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))
    expect(body.events).toHaveLength(1)
  })

  it.each(["email", "name", "cookie", "token", "body", "amountMinor"])("refuses sensitive property %s", (property) => {
    const client = createTelemetryClient("matriz-ops")
    expect(() => client.track({ tenantId: asTenantId("tenant_1"), type: "unsafe", properties: { [property]: "secret" } })).toThrow("Sensitive telemetry property")
  })

  it("retains an unsent batch when ingestion fails", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 503 }))
    const client = createTelemetryClient("matriz-ops", { sink: createHttpTelemetrySink({ endpoint: "https://hub.example/ingest", token: "service-token", fetcher }) })
    client.track({ tenantId: asTenantId("tenant_1"), type: "app.heartbeat", properties: { version: "1.0.0" } })
    await expect(client.flush()).rejects.toThrow("503")
    expect(client.pending()).toBe(1)
  })
})
