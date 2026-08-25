export interface RouteFlowStep { readonly route: string; readonly outcome: string }
export interface RouteFlowDefinition { readonly id: string; readonly title: string; readonly description: string; readonly steps: readonly RouteFlowStep[] }
export type RouteFlowParseResult = { readonly kind: "valid"; readonly steps: readonly RouteFlowStep[] } | { readonly kind: "invalid"; readonly line: number; readonly message: string }

export function parseRouteFlow(source: string): RouteFlowParseResult {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const steps: RouteFlowStep[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const [routePart, ...outcomeParts] = lines[index].split(/\s+[—–-]\s+/)
    const route = routePart.trim()
    if (!route.startsWith("/") || route.startsWith("//")) return { kind: "invalid", line: index + 1, message: "Use uma rota relativa iniciada por /" }
    const outcome = outcomeParts.join(" — ").trim()
    if (!outcome) return { kind: "invalid", line: index + 1, message: "Descreva o resultado depois de —" }
    steps.push({ route, outcome })
  }
  return { kind: "valid", steps }
}

export function routeFlowToMarkdown(title: string, steps: readonly RouteFlowStep[]): string {
  return [`### ${title}`, "", ...steps.map((step, index) => `${index + 1}. \`${step.route}\` → ${step.outcome}`)].join("\n")
}

export const CANONICAL_ROUTE_FLOWS: readonly RouteFlowDefinition[] = [
  { id: "company-entry", title: "Entrada na empresa", description: "Da autenticação ao workspace tenant-scoped persistente.", steps: [
    { route: "/login", outcome: "autenticar no ecossistema Matriz" }, { route: "/", outcome: "selecionar ou criar uma empresa autorizada" },
    { route: "/onboarding", outcome: "salvar e retomar a configuração inicial" }, { route: "/workspace", outcome: "entrar no workspace resolvido no servidor" },
  ] },
  { id: "member-invite", title: "Convite de membro", description: "Hoje o link é compartilhado manualmente; nenhum e-mail é simulado.", steps: [
    { route: "/workspace/members", outcome: "informar e-mail e função permitida" }, { route: "/invite/[token]", outcome: "autenticar com o e-mail convidado e aceitar" },
    { route: "/workspace", outcome: "entrar na empresa com membership persistida" },
  ] },
  { id: "catalog-authoring", title: "Catálogo", description: "Categoria, produto e variantes sem acoplamento prematuro ao estoque.", steps: [
    { route: "/workspace/products", outcome: "consultar o catálogo autorizado" }, { route: "/workspace/products/new", outcome: "cadastrar produto e variantes" },
    { route: "/workspace/products/[productId]", outcome: "retomar e editar o cadastro real" }, { route: "/workspace/products/[productId]/recipe", outcome: "compor receita com ingredientes e disponibilidade real" },
  ] },
  { id: "stock-operation", title: "Estoque por ingrediente", description: "Saldos e movimentos append-only com versão e idempotência.", steps: [
    { route: "/workspace/ingredients", outcome: "cadastrar ingredientes reutilizáveis" }, { route: "/workspace/stock", outcome: "ver saúde e saldo tenant-scoped" },
    { route: "/workspace/stock/[ingredientId]", outcome: "registrar movimento auditável sem saldo negativo" },
  ] },
  { id: "demo-commerce", title: "Compra simulada até a operação", description: "Checkout público cria cliente, pedido e consumo de estoque em uma transação.", steps: [
    { route: "/store/[storeSlug]", outcome: "resolver publicação e catálogo pelo slug no servidor" }, { route: "/store/[storeSlug]/checkout", outcome: "enviar somente item, quantidade e contato" },
    { route: "/store/[storeSlug]/checkout/success", outcome: "confirmar o pedido persistido sem cobrança real" }, { route: "/workspace/orders", outcome: "operar o pedido autorizado" },
    { route: "/workspace/customers", outcome: "consultar o cliente tenant-local e seu histórico" },
  ] },
  { id: "essential-finance", title: "Financeiro essencial", description: "Receitas de pedidos e lançamentos manuais formam um livro tenant-scoped auditável.", steps: [
    { route: "/workspace/finance", outcome: "acompanhar caixa, competência, vencimentos e criar lançamento manual" },
    { route: "/workspace/finance/entries/[entryId]", outcome: "consultar eventos e liquidar ou cancelar um lançamento manual aberto" },
  ] },
]
