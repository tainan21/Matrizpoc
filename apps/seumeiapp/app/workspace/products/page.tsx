import Link from "next/link"
import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../src/application/active-company"
import { readCatalog } from "../../../src/application/catalog-service"
import { resolveCompanyPageFoundation } from "../../../src/auth/server-page-context"
import { SystemState } from "../../../src/ui/SystemState"
import { toCatalogViewModel } from "../../../src/ui/presenters/catalog.presenter"
export default async function ProductsPage() {
  const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/")
  try { const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies); const catalog = toCatalogViewModel(await readCatalog(context, foundation.services.catalog))
    return <main className="catalog-page"><header><div><span className="eyebrow">OPERAÇÃO / CATÁLOGO</span><h1>Produtos</h1><p>{catalog.summaryLabel}</p></div>{catalog.canManage && <Link className="catalog-primary" href="/workspace/products/new">Novo produto</Link>}</header>
      {catalog.isEmpty ? <section className="catalog-empty"><h2>Seu catálogo começa vazio.</h2><p>Nenhum dado falso foi criado. Cadastre o primeiro produto quando estiver pronto.</p>{catalog.canManage && <Link href="/workspace/products/new">Cadastrar produto</Link>}</section> : <section className="catalog-grid">{catalog.products.map((product) => <Link href={`/workspace/products/${product.id}`} key={product.id}><span className="eyebrow">{product.status}</span><h2>{product.name}</h2><p>{product.priceLabel}</p><small>{product.variantCount} {product.variantCount === 1 ? "variante" : "variantes"} · {product.type === "SIMPLE" ? "simples" : "configurável"}</small></Link>)}</section>}
    </main>
  } catch { return <SystemState kind="forbidden" /> }
}
