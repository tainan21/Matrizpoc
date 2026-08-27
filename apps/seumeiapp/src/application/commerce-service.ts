import type { AuthorizedCompanyContext } from "./company-onboarding"
import { can } from "../domain/membership"
import { normalizeCheckoutCustomer, type CommerceOrderStatus } from "../domain/commerce"
import type { CommerceRepository } from "../domain/repositories/commerce-repository"

export class CommerceCapabilityDeniedError extends Error { constructor() { super("Sua função não permite esta operação"); this.name = "CommerceCapabilityDeniedError" } }

export async function readPublicStore(slug: string, repository: CommerceRepository) { return repository.findPublishedStoreBySlug(slug.trim().toLowerCase()) }
export async function checkoutPublicStore(slug: string, input: { variantId: string; quantity: number; name: string; email: string; phone?: string; idempotencyKey: string }, repository: CommerceRepository) {
  if (input.idempotencyKey.trim().length < 8 || input.idempotencyKey.length > 128) throw new Error("INVALID_CHECKOUT_KEY")
  return repository.checkoutPublishedStore(slug.trim().toLowerCase(), { variantId: input.variantId, quantity: input.quantity, customer: normalizeCheckoutCustomer(input), idempotencyKey: input.idempotencyKey.trim() })
}
export async function publishCompanyStore(context: AuthorizedCompanyContext, input: { storeSlug: string; displayName: string; description: string | null }, repository: CommerceRepository) {
  if (!can(context.role, "orders.manage")) throw new CommerceCapabilityDeniedError()
  return repository.publishStore(context.company.tenantId, context.company.id, input)
}
export async function readOrders(context: AuthorizedCompanyContext, repository: CommerceRepository) { if (!can(context.role, "orders.read")) throw new CommerceCapabilityDeniedError(); return repository.listOrders(context.company.tenantId) }
export async function readOrder(context: AuthorizedCompanyContext, orderId: string, repository: CommerceRepository) { if (!can(context.role, "orders.read")) throw new CommerceCapabilityDeniedError(); return repository.findOrder(context.company.tenantId, orderId) }
export async function advanceOrder(context: AuthorizedCompanyContext, orderId: string, expectedVersion: number, status: CommerceOrderStatus, repository: CommerceRepository) { if (!can(context.role, "orders.manage")) throw new CommerceCapabilityDeniedError(); return repository.transitionOrder(context.company.tenantId, orderId, expectedVersion, status, context.userId) }
export async function readCustomers(context: AuthorizedCompanyContext, repository: CommerceRepository) { if (!can(context.role, "customers.read")) throw new CommerceCapabilityDeniedError(); return repository.listCustomers(context.company.tenantId) }
export async function readCustomer(context: AuthorizedCompanyContext, customerId: string, repository: CommerceRepository) { if (!can(context.role, "customers.read")) throw new CommerceCapabilityDeniedError(); return repository.findCustomer(context.company.tenantId, customerId) }
