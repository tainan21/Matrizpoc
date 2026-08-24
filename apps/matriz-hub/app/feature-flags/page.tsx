import { mockTenants } from "@matriz/access-tenants"
import { MATRIZ_APP_IDS } from "@matriz/foundation-constants"
import { listFlagsForTenant } from "@matriz/platform-config"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel, StatusMark } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"
import { presentFeatureFlag } from "../../src/ui/operations/operations-presenter"

export default function FeatureFlagsPage() {
  const tenants = mockTenants.map((tenant) => ({ tenant, flags: listFlagsForTenant(tenant.id) }))
  const allFlags = tenants.flatMap((item) => item.flags)
  const enabled = allFlags.filter((flag) => flag.enabled).length

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Disponibilidade demonstrativa de capacidades por organização e app. Chaves técnicas permanecem visíveis; o seed mock é declarado como origem."
        eyebrow="Operação / disponibilidade"
        status={allFlags.length ? "available" : "waiting"}
        statusLabel={allFlags.length ? `${enabled} capacidades disponíveis` : "Sem flags no seed"}
        title="Controles de capacidade"
      />
      <MetricStrip items={[
        { label: "Flags", value: allFlags.length, detail: "linhas do seed", status: "available", icon: "flag" },
        { label: "Disponíveis", value: enabled, detail: "enabled=true", status: enabled ? "complete" : "waiting", icon: "check" },
        { label: "Desativadas", value: allFlags.length - enabled, detail: "enabled=false", status: "archived", icon: "close" },
        { label: "Origem", value: "Mock", detail: "platform/config seed", status: "temporary", icon: "database" },
      ]} />
      <section className="hub-flags-grid">{tenants.map(({ tenant, flags }) => (
        <article className="hub-flags-tenant" key={tenant.id}>
          <header><span><HubIcon name="flag" size={20} /></span><div><p className="hub-eyebrow">{tenant.id}</p><h2>{tenant.name}</h2></div><StatusLabel compact status="temporary">Seed mock</StatusLabel></header>
          {flags.length === 0 ? <SurfaceState compact kind="empty" title="Sem flags" description="Nenhuma capacidade condicional foi declarada para esta organização." /> : (
            <div>{MATRIZ_APP_IDS.map((appId) => {
              const appFlags = flags.filter((flag) => flag.appId === appId)
              if (!appFlags.length) return null
              return <section key={appId}><header><strong>{appId}</strong><small>{appFlags.length} controles</small></header>{appFlags.map((flag) => {
                const vm = presentFeatureFlag(flag)
                return <div className="hub-flag-row" key={`${flag.tenantId}:${flag.appId}:${flag.flag}`}><StatusMark status={vm.status} /><span><strong>{vm.label}</strong><small>{vm.technicalLabel}</small></span><StatusLabel compact status={vm.status}>{vm.statusLabel}</StatusLabel></div>
              })}</section>
            })}</div>
          )}
        </article>
      ))}</section>
    </div>
  )
}
