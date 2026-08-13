import { mockTenants } from "@matriz/access-tenants"
import { MATRIZ_APP_IDS } from "@matriz/foundation-constants"
import { getGlobalOnboardingStore } from "@matriz/flows-onboarding"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel, StatusMark } from "../../src/ui/environment/status"
import { MetricStrip, OperationalPageHeader, ProgressTrack } from "../../src/ui/structure/OperationalPage"
import { presentOnboarding } from "../../src/ui/operations/operations-presenter"

export default function OnboardingStatusPage() {
  const store = getGlobalOnboardingStore()
  const tenants = mockTenants.map((tenant) => {
    const progress = store.load(tenant.id)
    return {
      tenant,
      progress,
      state: presentOnboarding(progress ? { completedAt: progress.completedAt, appPayloadCount: Object.keys(progress.perApp).length } : undefined),
    }
  })
  const completed = tenants.filter((item) => item.state.status === "complete").length
  const running = tenants.filter((item) => item.state.status === "running").length

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Preparação compartilhada por organização e app. A interface diferencia o que não começou, está em andamento e foi concluído."
        eyebrow="Operação / preparação"
        status={running ? "running" : completed === tenants.length && tenants.length ? "complete" : "planned"}
        statusLabel={running ? "Há configurações em andamento" : completed ? "Configurações concluídas" : "Aguardando início"}
        title="Preparação das organizações"
      />
      <MetricStrip items={[
        { label: "Organizações", value: tenants.length, detail: "tenants conhecidos", status: "available", icon: "user" },
        { label: "Concluídas", value: completed, detail: "fluxo completo", status: completed ? "complete" : "waiting", icon: "check" },
        { label: "Em preparação", value: running, detail: "progresso salvo", status: running ? "running" : "waiting", icon: "activity" },
        { label: "Persistência", value: "Local", detail: "store atual", status: "temporary", icon: "database" },
      ]} />
      <section className="hub-onboarding-grid">{tenants.map(({ tenant, progress, state }) => (
        <article className="hub-onboarding-tenant" key={tenant.id}>
          <header><span><HubIcon name="onboarding" size={20} /></span><div><p className="hub-eyebrow">{tenant.id}</p><h2>{tenant.name}</h2></div><StatusLabel compact status={state.status}>{state.label}</StatusLabel></header>
          <ProgressTrack label={`Preparação de ${tenant.name}`} status={state.status} value={state.progress} />
          <div className="hub-onboarding-tenant__apps">{MATRIZ_APP_IDS.map((appId) => {
            const enabled = tenant.enabledApps.includes(appId)
            const configured = Object.prototype.hasOwnProperty.call(progress?.perApp ?? {}, appId)
            const status = progress?.completedAt ? "complete" : configured ? "running" : enabled ? "waiting" : "unavailable"
            return <div key={appId}><StatusMark status={status} /><span><strong>{appId}</strong><small>{!enabled ? "Não habilitado" : progress?.completedAt ? "Preparado" : configured ? "Em configuração" : "Aguardando configuração"}</small></span><StatusLabel compact status={status} /></div>
          })}</div>
          <footer><span>Store de onboarding compartilhado</span><small>{progress?.completedAt ? `Concluído em ${new Date(progress.completedAt).toLocaleString("pt-BR")}` : "Sem conclusão registrada"}</small></footer>
        </article>
      ))}</section>
    </div>
  )
}
