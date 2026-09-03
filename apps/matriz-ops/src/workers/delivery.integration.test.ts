import { afterAll, describe, expect, it } from "vitest"
import { getOpsDb, getOpsWorkerDb } from "@matriz/platform-db/ops"
import { startOpsInboxWorker } from "./ops-inbox-worker"

const integration = describe.runIf(process.env.RUN_OPS_INBOX_INTEGRATION === "1")

integration("Ops durable inbox on real portable infrastructure", () => {
  afterAll(async () => {
    await Promise.all([getOpsDb().$disconnect(), getOpsWorkerDb().$disconnect()])
  })

  it("acknowledges a Pay event only after its inbox and projection commit", async () => {
    const runtime = await startOpsInboxWorker(process.env)
    try {
      let projection = null
      const deadline = Date.now() + 10_000
      while (!projection && Date.now() < deadline) {
        projection = await getOpsDb().opsPayEventProjection.findFirst({ orderBy: { receivedAt: "desc" } })
        if (!projection) await new Promise((resolve) => setTimeout(resolve, 100))
      }
      expect(projection).toMatchObject({ eventName: "wallet.created" })
      await expect(getOpsDb().opsInboxEvent.findUnique({ where: { sourceEventId: projection!.sourceEventId } })).resolves.toMatchObject({
        sourceEventId: projection!.sourceEventId,
        sourceApp: "matriz-pay",
      })
    } finally {
      await runtime.stop()
    }
  }, 15_000)
})
