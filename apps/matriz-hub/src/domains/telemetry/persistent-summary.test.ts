import { describe, expect, it } from "vitest"
import { summarizePersistentTelemetry } from "./persistent-summary"

describe("persistent telemetry summary", () => {
  it("aggregates active users, sessions, errors, p95 and app heartbeat", () => {
    const now = new Date("2026-08-25T12:00:00Z")
    const rows = Array.from({ length: 20 }, (_, index) => ({
      appId: "spot",
      eventName: index === 0 ? "request.error" : "request.completed",
      occurredAt: new Date(`2026-08-25T11:${String(20 + index).padStart(2, "0")}:00Z`),
      properties: { subjectHash: `user_${index % 3}`, sessionHash: `session_${index % 4}`, durationMs: index + 1, appVersion: "1.4.0" },
    }))
    const summary = summarizePersistentTelemetry(rows, ["spot"], now)
    expect(summary.apps[0]).toMatchObject({ appId: "spot", activeUsers24h: 3, activeUsers7d: 3, sessions7d: 4, events7d: 20, errors7d: 1, p95DurationMs: 19, appVersion: "1.4.0" })
  })

  it("raises a silent-app alert when no recent signal exists", () => {
    const summary = summarizePersistentTelemetry([], ["spot"], new Date("2026-08-25T12:00:00Z"))
    expect(summary.alerts).toContainEqual(expect.objectContaining({ appId: "spot", code: "NO_INGESTION" }))
  })
})
