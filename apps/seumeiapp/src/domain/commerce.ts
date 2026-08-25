export type CommerceOrderStatus = "PLACED" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"

export class InvalidCommerceInputError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidCommerceInputError" }
}

export function normalizeCheckoutCustomer(input: { name: string; email: string; phone?: string }) {
  const name = input.name.trim().replace(/\s+/g, " ")
  const email = input.email.trim().toLowerCase()
  let phone = (input.phone ?? "").replace(/\D/g, "")
  if (phone.length === 11) phone = `55${phone}`
  if (name.length < 2 || name.length > 120) throw new InvalidCommerceInputError("Informe seu nome")
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InvalidCommerceInputError("Informe um e-mail válido")
  if (phone && (phone.length < 10 || phone.length > 15)) throw new InvalidCommerceInputError("Informe um telefone válido")
  return { name, email, phone: phone || null }
}

export function computeOrderTotal(unitPriceCents: number, quantity: number): number {
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents <= 0 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new InvalidCommerceInputError("Item inválido")
  }
  const total = unitPriceCents * quantity
  if (!Number.isSafeInteger(total)) throw new InvalidCommerceInputError("Total inválido")
  return total
}

const NEXT: Readonly<Record<CommerceOrderStatus, readonly CommerceOrderStatus[]>> = {
  PLACED: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PREPARING", "CANCELLED"], PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [],
}

export function requireOrderTransition(from: CommerceOrderStatus, to: CommerceOrderStatus): CommerceOrderStatus {
  if (!NEXT[from].includes(to)) throw new InvalidCommerceInputError("Transição de pedido inválida")
  return to
}
