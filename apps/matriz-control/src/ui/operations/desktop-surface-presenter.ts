export type OperationalRuntime = "web" | "desktop"

export function presentDesktopSurface(runtime: OperationalRuntime, label: string) {
  if (runtime === "desktop") return { available: true, message: `${label} disponíveis no desktop.` }
  return { available: false, message: "Este painel requer o aplicativo desktop instalado." }
}
