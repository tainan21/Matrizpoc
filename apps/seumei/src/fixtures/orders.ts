import { asCompanyId } from "../domains/companies/domain/company"
import { asProductId } from "../domains/catalog/domain/catalog"
import { asOrderId, type Order, type OrderStatus } from "../domains/orders/domain/order"
import { asStoreId } from "../domains/store/domain/store"

const companyId = asCompanyId("company-galaxia")
const storeId = asStoreId("store-galaxia")

function order(input: { id: string; customerName: string; productId: string; productName: string; status: OrderStatus; totalCents: number; createdAt: string }): Order {
  const deliveryFeeCents = 590
  const subtotalCents = input.totalCents - deliveryFeeCents
  return {
    id: asOrderId(input.id), companyId, storeId, customerName: input.customerName, status: input.status,
    items: [{ productId: asProductId(input.productId), productName: input.productName, quantity: 1, unitPriceCents: subtotalCents, modifierNames: [], modifiersCents: 0, totalCents: subtotalCents, observation: "" }],
    subtotalCents, deliveryFeeCents, totalCents: input.totalCents, createdAt: input.createdAt, updatedAt: input.createdAt,
  }
}

export const FIXTURE_ORDERS: readonly Order[] = [
  order({ id: "order-demo-1254", customerName: "Lucas Ferreira", productId: "product-x-galaxia", productName: "X-Galáxia", status: "placed", totalCents: 6490, createdAt: "2026-08-25T12:45:00.000Z" }),
  order({ id: "order-demo-1253", customerName: "Mariana Santos", productId: "product-combo-galactico", productName: "Combo Galáctico", status: "preparing", totalCents: 8980, createdAt: "2026-08-25T12:42:00.000Z" }),
  order({ id: "order-demo-1252", customerName: "Pedro Costa", productId: "product-galaxia-bacon", productName: "Galáxia Bacon", status: "placed", totalCents: 4590, createdAt: "2026-08-25T12:40:00.000Z" }),
  order({ id: "order-demo-1251", customerName: "Juliana Lima", productId: "product-x-galaxia", productName: "X-Galáxia", status: "ready", totalCents: 7470, createdAt: "2026-08-25T12:32:00.000Z" }),
  order({ id: "order-demo-1250", customerName: "Rafael Costa", productId: "product-galaxia-bacon", productName: "Galáxia Bacon", status: "delivered", totalCents: 5290, createdAt: "2026-08-25T12:18:00.000Z" }),
]
