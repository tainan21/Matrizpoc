import { beforeEach, describe, expect, it } from "vitest"
import { getPayDb } from "@matriz/platform-db/pay"
import { ensureWallet, postMtrzAdjustment, walletSummaryForUser } from "./wallet-service"
import { processStoredProviderEvent } from "./provider-event-service"

const integration = describe.runIf(process.env.RUN_POSTGRES_INTEGRATION === "1")
integration("Pay on real Postgres", () => {
  beforeEach(async () => {
    const db=getPayDb(); await db.payOutboxEvent.deleteMany(); await db.providerEvent.deleteMany(); await db.reconciliationDiscrepancy.deleteMany(); await db.reconciliationRun.deleteMany(); await db.providerAccountLink.deleteMany(); await db.ledgerPosting.deleteMany(); await db.ledgerTransaction.deleteMany(); await db.walletAccount.deleteMany(); await db.wallet.deleteMany()
  })
  it("serializes concurrent MTRZ debits and preserves zero-sum postings", async () => {
    const wallet=await ensureWallet("user-integration")
    await postMtrzAdjustment({walletId:wallet.id,payload:{amount:{currency:"MTRZ",amountMinor:"100"},direction:"CREDIT",reason:"Crédito de integração autorizado",correlationId:"corr-integration-seed"},idempotencyKey:"idem-integration-seed",actorId:"owner-integration"})
    const results=await Promise.allSettled(["a","b"].map(key=>postMtrzAdjustment({walletId:wallet.id,payload:{amount:{currency:"MTRZ",amountMinor:"80"},direction:"DEBIT",reason:"Débito concorrente de integração",correlationId:`corr-integration-${key}`},idempotencyKey:`idem-integration-${key}`,actorId:"owner-integration"})))
    expect(results.filter(item=>item.status==="fulfilled")).toHaveLength(1)
    expect((await walletSummaryForUser("user-integration"))?.accounts.find(item=>item.currency==="MTRZ")?.balance.amountMinor).toBe("20")
    const transactions=await getPayDb().ledgerTransaction.findMany({include:{postings:true}})
    for(const transaction of transactions)expect(transaction.postings.reduce((sum,item)=>sum+(item.side==="DEBIT"?item.amountMinor:-item.amountMinor),0n)).toBe(0n)
  })
  it("posts one BRL cash-in for duplicate processing of the same durable event",async()=>{
    const wallet=await ensureWallet("user-brl-integration")
    await getPayDb().providerAccountLink.create({data:{walletId:wallet.id,provider:"CELCOIN",providerAccountId:"acct-celcoin-1",kycStatus:"APPROVED"}})
    const event=await getPayDb().providerEvent.create({data:{provider:"celcoin",providerEventId:"event-cashin-1",eventType:"pix-payment-in",payloadHash:"hash",signature:"signature",payloadJson:{amountExact:"12.50",providerReference:"E2E-integration-1",providerAccountId:"acct-celcoin-1"}}})
    const first=await processStoredProviderEvent(event.id);const second=await processStoredProviderEvent(event.id)
    expect(second).toBe(first)
    expect(await getPayDb().ledgerTransaction.count({where:{providerReference:"E2E-integration-1"}})).toBe(1)
    expect((await walletSummaryForUser("user-brl-integration"))?.accounts.find(item=>item.currency==="BRL")?.balance.amountMinor).toBe("1250")
  })
})
