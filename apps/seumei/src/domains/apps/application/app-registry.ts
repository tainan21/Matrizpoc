import type { SeumeiAppDefinition, SeumeiAppId } from "../domain/app"

export const SEUMEI_APP_REGISTRY: readonly SeumeiAppDefinition[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Visão operacional da empresa",
    icon: "dashboard",
    routeSegment: "dashboard",
    requiredPermission: "dashboard.view",
    navigation: [{ id: "overview", label: "Visão geral", path: "" }],
  },
  {
    id: "crm",
    name: "CRM",
    description: "Clientes e relacionamento",
    icon: "users",
    routeSegment: "crm",
    requiredPermission: "crm.view",
    navigation: [
      { id: "overview", label: "Visão geral", path: "" },
      { id: "customers", label: "Clientes", path: "/customers" },
      { id: "segments", label: "Segmentos", path: "/segments" },
    ],
  },
  {
    id: "products",
    name: "Produtos",
    description: "Catálogo, preço e disponibilidade",
    icon: "package",
    routeSegment: "products",
    requiredPermission: "products.view",
    navigation: [
      { id: "products", label: "Produtos", path: "" },
      { id: "categories", label: "Categorias", path: "/categories" },
    ],
  },
  {
    id: "orders",
    name: "Pedidos",
    description: "Operação e histórico de pedidos",
    icon: "receipt",
    routeSegment: "orders",
    requiredPermission: "orders.view",
    navigation: [{ id: "orders", label: "Todos os pedidos", path: "" }],
  },
  {
    id: "inventory",
    name: "Estoque",
    description: "Disponibilidade e alertas",
    icon: "boxes",
    routeSegment: "inventory",
    requiredPermission: "inventory.view",
    navigation: [{ id: "inventory", label: "Visão do estoque", path: "" }],
  },
  {
    id: "finance",
    name: "Financeiro",
    description: "Receitas e visão financeira",
    icon: "wallet",
    routeSegment: "finance",
    requiredPermission: "finance.view",
    navigation: [{ id: "summary", label: "Resumo", path: "" }],
  },
  {
    id: "store",
    name: "Loja",
    description: "Publicação e operação da loja",
    icon: "store",
    routeSegment: "store",
    requiredPermission: "store.view",
    navigation: [
      { id: "overview", label: "Visão geral", path: "" },
      { id: "configuration", label: "Configuração", path: "/configuration" },
    ],
  },
  {
    id: "reports",
    name: "Relatórios",
    description: "Indicadores e análises",
    icon: "chart",
    routeSegment: "reports",
    requiredPermission: "reports.view",
    navigation: [{ id: "reports", label: "Relatórios", path: "" }],
  },
]

export function findAppDefinition(
  appId: string,
): SeumeiAppDefinition | undefined {
  return SEUMEI_APP_REGISTRY.find((definition) => definition.id === appId)
}

export function isSeumeiAppId(value: string): value is SeumeiAppId {
  return Boolean(findAppDefinition(value))
}
