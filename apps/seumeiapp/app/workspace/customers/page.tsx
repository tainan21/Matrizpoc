import Link from "next/link"
import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../src/application/active-company"
import { readCustomers } from "../../../src/application/commerce-service"
import { resolveCompanyPageFoundation } from "../../../src/auth/server-page-context"
import { SystemState } from "../../../src/ui/SystemState"
import { toCustomerViewModel } from "../../../src/ui/presenters/commerce.presenter"
export default async function CustomersPage() { const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/"); try { const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies); const customers = (await readCustomers(context, foundation.services.commerce)).map(toCustomerViewModel); return <main className="restaurant-page customers-page"><header><div><span className="eyebrow">RELACIONAMENTO</span><h1>Clientes</h1><p>Histórico tenant-local criado por pedidos persistidos.</p></div></header><section className="customer-list">{customers.map((customer) => <Link href={`/workspace/customers/${customer.id}`} key={customer.id}><strong>{customer.name}</strong><span>{customer.email}</span><span>{customer.orderCount} pedido(s)</span><span>{customer.totalSpent}</span><small>{customer.lastOrderLabel}</small></Link>)}</section></main> } catch { return <SystemState kind="forbidden" /> } }
