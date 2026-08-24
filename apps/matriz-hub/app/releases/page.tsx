import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel, StatusMark } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { presentEvolution } from "../../src/ui/evolution/evolution-presenter"
import { readEvolutionSource } from "../../src/ui/evolution/evolution-source"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"

export const dynamic = "force-dynamic"

export default function ReleasesPage() {
  const vm = presentEvolution(readEvolutionSource())
  const validated = vm.releases.filter((item) => item.status === "official").length
  return (
    <div className="hub-page">
      <OperationalPageHeader eyebrow="Evolução / entregas" title="Registro de entregas" description="Implementações e validações derivadas da atividade local. Uma implementação só é distinguida como validada quando existe o registro correspondente." status={validated ? "official" : "planned"} statusLabel={validated ? "Validações registradas" : "Sem validação registrada"} />
      <MetricStrip items={[
        { label: "Registros", value: vm.releases.length, detail: "entregas conhecidas", status: vm.releases.length ? "available" : "waiting", icon: "release" },
        { label: "Validadas", value: validated, detail: "feature.validated", status: validated ? "official" : "planned", icon: "check" },
        { label: "Implementadas", value: vm.releases.length - validated, detail: "aguardam validação explícita", status: vm.releases.length - validated ? "attention" : "complete", icon: "tool" },
        { label: "Persistência", value: "JSONL", detail: "histórico local", status: "temporary", icon: "database" },
      ]} />
      <section className="hub-release-ledger">
        <header className="hub-structure-toolbar"><div><h2>Linha de entrega</h2><small>Implementar → validar → disponibilizar</small></div><StatusLabel compact status="temporary">Registro local</StatusLabel></header>
        {vm.releases.length ? <ol>{vm.releases.map((release) => (
          <li key={release.id}><span className="hub-release-ledger__rail"><StatusMark status={release.status} /></span><time>{new Date(release.occurredAt).toLocaleString("pt-BR")}</time><div><small>{release.entityType} · {release.entityId}</small><strong>{release.summary}</strong><code>{release.technicalLabel}</code></div><StatusLabel compact status={release.status}>{release.label}</StatusLabel></li>
        ))}</ol> : <SurfaceState compact kind="empty" title="Nenhuma entrega registrada" description="A tela permanece vazia até que uma implementação ou validação real apareça no histórico local." />}
      </section>
      <section className="hub-operation-note"><HubIcon name="release" size={20} /><div><strong>Entrega não significa deploy</strong><p>Estes registros comprovam implementação ou validação local. Sem integração de implantação, o Hub não afirma que algo está em produção.</p></div></section>
    </div>
  )
}
