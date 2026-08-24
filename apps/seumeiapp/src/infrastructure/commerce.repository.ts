import { createHash } from "node:crypto"
import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import { computeOrderTotal, requireOrderTransition, type CommerceOrderStatus } from "../domain/commerce"
import type { CheckoutCommand, CommerceRepository, CustomerRecord, OrderRecord, PublishedStoreRecord } from "../domain/repositories/commerce-repository"

export class StoreUnavailableError extends Error { constructor() { super("Loja indisponível"); this.name = "StoreUnavailableError" } }
export class CheckoutConflictError extends Error { constructor(message = "Esta tentativa de compra representa outro pedido") { super(message); this.name = "CheckoutConflictError" } }
export class CheckoutStockUnavailableError extends Error { constructor() { super("Estoque insuficiente para concluir a compra"); this.name = "CheckoutStockUnavailableError" } }

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex") }
function available(recipe: any): number {
  if (!recipe?.lines?.length) return 0
  return Math.min(...recipe.lines.map((line: any) => Math.floor((line.ingredient.inventory?.balance ?? 0) * recipe.yieldQuantity / line.quantity)))
}
function store(row: any): PublishedStoreRecord {
  return { tenantId: row.tenantId, companyId: row.companyId, storeSlug: row.storeSlug, displayName: row.displayName, description: row.description, version: row.version,
    products: (row.company?.products ?? row.products ?? []).flatMap((product: any) => product.variants.map((variant: any) => ({ productId: product.id, variantId: variant.id, name: product.name, description: product.description, priceCents: variant.priceCents, imageUrl: product.images[0]?.url ?? null, imageAlt: product.images[0]?.altText ?? null, availableQuantity: available(variant.recipe) }))),
  }
}
function order(row: any): OrderRecord {
  return { id: row.id, tenantId: row.tenantId, orderNumber: row.orderNumber, status: row.status, customer: { id: row.customer.id, name: row.customer.name, email: row.customer.normalizedEmail, phone: row.customer.normalizedPhone }, subtotalCents: row.subtotalCents, totalCents: row.totalCents, currency: row.currency, version: row.version, createdAt: row.createdAt.toISOString(), items: row.items.map((item: any) => ({ id: item.id, name: item.productNameSnapshot, variantName: item.variantNameSnapshot, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents })), timeline: row.timeline.map((event: any) => ({ status: event.status, note: event.note, createdAt: event.createdAt.toISOString() })) }
}
const orderInclude = { customer: true, items: true, timeline: { orderBy: { createdAt: "asc" as const } } }
const productInclude = { images: { orderBy: { position: "asc" as const } }, variants: { where: { isActive: true }, orderBy: { position: "asc" as const }, include: { recipe: { include: { lines: { include: { ingredient: { include: { inventory: true } } } } } } } } }

export function createCommerceRepository(db: SeumeiPrismaClient): CommerceRepository {
  async function readStore(storeSlug: string) {
    const publication = await db.storePublication.findFirst({ where: { storeSlug, isPublished: true } })
    if (!publication) return null
    const products = await db.product.findMany({ where: { tenantId: publication.tenantId, status: "ACTIVE" }, include: productInclude, orderBy: { name: "asc" } })
    return store({ ...publication, products })
  }
  return {
    async publishStore(tenantId, companyId, input) {
      const company = await db.company.findFirst({ where: { id: companyId, tenantId, status: "ACTIVE" } })
      if (!company) throw new StoreUnavailableError()
      await db.storePublication.upsert({ where: { tenantId }, create: { tenantId, companyId, ...input, isPublished: true, publishedAt: new Date() }, update: { ...input, isPublished: true, publishedAt: new Date(), version: { increment: 1 } } })
      const result = await readStore(input.storeSlug)
      if (!result) throw new StoreUnavailableError()
      return result
    },
    findPublishedStoreBySlug: readStore,
    async checkoutPublishedStore(storeSlug, command) {
      const identity = hash(command)
      return db.$transaction(async (tx) => {
        const publication = await tx.storePublication.findFirst({ where: { storeSlug, isPublished: true } })
        if (!publication) throw new StoreUnavailableError()
        const replay = await tx.commerceOrder.findUnique({ where: { tenantId_idempotencyKey: { tenantId: publication.tenantId, idempotencyKey: command.idempotencyKey } }, include: orderInclude })
        if (replay) { if (replay.commandHash !== identity) throw new CheckoutConflictError(); return order(replay) }
        const variant = await tx.productVariant.findFirst({ where: { id: command.variantId, tenantId: publication.tenantId, isActive: true, product: { status: "ACTIVE" } }, include: { product: true, recipe: { include: { lines: { include: { ingredient: { include: { inventory: true } } } } } } } })
        if (!variant?.recipe?.lines.length) throw new StoreUnavailableError()
        const totalCents = computeOrderTotal(variant.priceCents, command.quantity)
        for (const line of variant.recipe.lines) if (!line.ingredient.inventory || line.ingredient.inventory.balance < line.quantity * command.quantity) throw new CheckoutStockUnavailableError()
        const customer = await tx.customer.upsert({ where: { tenantId_normalizedEmail: { tenantId: publication.tenantId, normalizedEmail: command.customer.email } }, create: { tenantId: publication.tenantId, name: command.customer.name, normalizedEmail: command.customer.email, normalizedPhone: command.customer.phone }, update: { name: command.customer.name, normalizedPhone: command.customer.phone } })
        const aggregate = await tx.commerceOrder.aggregate({ where: { tenantId: publication.tenantId }, _max: { orderNumber: true } })
        const created = await tx.commerceOrder.create({ data: { tenantId: publication.tenantId, customerId: customer.id, orderNumber: (aggregate._max.orderNumber ?? 0) + 1, subtotalCents: totalCents, totalCents, idempotencyKey: command.idempotencyKey, commandHash: identity, items: { create: [{ variantId: variant.id, productNameSnapshot: variant.product.name, variantNameSnapshot: variant.name, unitPriceCents: variant.priceCents, quantity: command.quantity, totalCents, recipeVersionSnapshot: variant.recipe.version }] }, timeline: { create: [{ status: "PLACED", actorType: "CUSTOMER", note: "Compra simulada aprovada" }] } }, include: orderInclude })
        const item = created.items[0]!
        for (const line of variant.recipe.lines) {
          const quantity = line.quantity * command.quantity
          const before = line.ingredient.inventory!.balance
          const updated = await tx.ingredientInventory.updateMany({ where: { id: line.ingredient.inventory!.id, tenantId: publication.tenantId, balance: { gte: quantity } }, data: { balance: { decrement: quantity }, version: { increment: 1 } } })
          if (updated.count !== 1) throw new CheckoutStockUnavailableError()
          const movement = await tx.ingredientStockMovement.create({ data: { tenantId: publication.tenantId, ingredientId: line.ingredientId, type: "ORDER_CONSUMPTION", signedQuantity: -quantity, balanceBefore: before, balanceAfter: before - quantity, reason: `Pedido #${created.orderNumber}`, actorUserId: "public:demo-store", idempotencyKey: `order-${created.id}-${line.ingredientId}`, commandHash: hash({ orderId: created.id, ingredientId: line.ingredientId, quantity }) } })
          await tx.orderStockConsumption.create({ data: { tenantId: publication.tenantId, orderItemId: item.id, ingredientId: line.ingredientId, movementId: movement.id, quantity } })
        }
        return order(created)
      }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 })
    },
    async listOrders(tenantId) { return (await db.commerceOrder.findMany({ where: { tenantId }, include: orderInclude, orderBy: { createdAt: "desc" }, take: 100 })).map(order) },
    async findOrder(tenantId, orderId) { const row = await db.commerceOrder.findFirst({ where: { id: orderId, tenantId }, include: orderInclude }); return row ? order(row) : null },
    async transitionOrder(tenantId, orderId, expectedVersion, status, actorUserId) {
      return db.$transaction(async (tx) => { const current = await tx.commerceOrder.findFirst({ where: { id: orderId, tenantId }, include: orderInclude }); if (!current) return null; requireOrderTransition(current.status as CommerceOrderStatus, status); const changed = await tx.commerceOrder.updateMany({ where: { id: orderId, tenantId, version: expectedVersion }, data: { status, version: { increment: 1 } } }); if (changed.count !== 1) throw new CheckoutConflictError("O pedido foi atualizado em outra sessão"); await tx.orderTimelineEvent.create({ data: { tenantId, orderId, status, actorType: "USER", actorId: actorUserId } }); const saved = await tx.commerceOrder.findFirst({ where: { id: orderId, tenantId }, include: orderInclude }); return saved ? order(saved) : null })
    },
    async listCustomers(tenantId) { const rows = await db.customer.findMany({ where: { tenantId }, include: { orders: { select: { totalCents: true, createdAt: true } } }, orderBy: { name: "asc" } }); return rows.map((row): CustomerRecord => ({ id: row.id, tenantId: row.tenantId, name: row.name, email: row.normalizedEmail, phone: row.normalizedPhone, orderCount: row.orders.length, totalSpentCents: row.orders.reduce((sum, item) => sum + item.totalCents, 0), lastOrderAt: row.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt.toISOString() ?? null })) },
    async findCustomer(tenantId, customerId) { return (await this.listCustomers(tenantId)).find(({ id }) => id === customerId) ?? null },
  }
}
