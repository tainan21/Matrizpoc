type EnvironmentInput = { id: string; name: string; version: string | null; port: number | null; actions: readonly { id: string; label: string }[] }
type RuntimeMode = "web" | "desktop"

export function presentEnvironments(items: readonly EnvironmentInput[], mode: RuntimeMode) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    version: item.version ?? "Versão não declarada",
    actions: item.actions.map((action) => action.label),
    port: item.port ? `:${item.port}` : "Sem porta declarada",
    mode,
    update: mode === "web" ? "Atualização via instalador indisponível no navegador" : "Consultar atualização no desktop",
  }))
}
