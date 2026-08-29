import type { DesktopUpdateSnapshot, StoreAppSnapshot } from "../../domain/desktop-bridge"

type Runtime = "web" | "desktop"
type ReadState = "loading" | "failed" | "ready"

export function presentPulseUpdateStatus(input: { runtime: Runtime; state?: ReadState; snapshot?: DesktopUpdateSnapshot }) {
  if (input.runtime === "web") return { headline: "Instalador indisponível no navegador", detail: "Atualizações do instalador não estão disponíveis no navegador." }
  if (input.state === "loading") return { headline: "Consultando atualizações", detail: "O processo desktop está verificando o updater local." }
  if (input.state === "failed") return { headline: "Não foi possível consultar atualizações", detail: "O bridge desktop não respondeu; tente reabrir o Control." }
  const snapshot = input.snapshot
  if (!snapshot) return { headline: "Atualizações indisponíveis", detail: "O processo desktop não devolveu um estado do updater." }
  return { headline: snapshot.availableVersion ? `Versão ${snapshot.availableVersion} disponível` : snapshot.state === "current" ? "Control atualizado" : snapshot.message, detail: snapshot.message }
}

export function presentEnvironmentUpdateStatus(input: { runtime: Runtime; state?: ReadState; appId: string; snapshots?: readonly StoreAppSnapshot[] }): string {
  if (input.runtime === "web") return "Atualizações de instalador indisponíveis no navegador"
  if (input.state === "loading") return "Consultando Store local"
  if (input.state === "failed") return "Não foi possível consultar a Store no desktop"
  const snapshot = input.snapshots?.find((item) => item.appId === input.appId)
  if (!snapshot) return "Sem canal de atualização declarado"
  return snapshot.state === "update_available" ? `Atualização ${snapshot.availableVersion ?? "disponível"}` : `Store: ${snapshot.message}`
}
