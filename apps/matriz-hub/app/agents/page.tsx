import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { presentEvolution } from "../../src/ui/evolution/evolution-presenter"
import { readEvolutionSource } from "../../src/ui/evolution/evolution-source"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"

export const dynamic = "force-dynamic"

export default function AgentsPage() {
  const vm = presentEvolution(readEvolutionSource())
  return (
    <div className="hub-page">
      <OperationalPageHeader eyebrow="Evolução / atores" title="Presença de agentes e pessoas" description="Atores encontrados na atividade persistida do Matriz-Hub. Esta área mostra registros históricos e não simula agentes conectados agora." status={vm.actors.length ? "available" : "waiting"} statusLabel={vm.actors.length ? "Histórico disponível" : "Sem atividade"} />
      <MetricStrip items={[
        { label: "Atores", value: vm.actors.length, detail: "identidades registradas", status: vm.actors.length ? "available" : "waiting", icon: "agent" },
        { label: "Atividades", value: vm.activityCount, detail: "linhas JSONL", status: vm.activityCount ? "complete" : "waiting", icon: "event" },
        { label: "Ao vivo", value: 0, detail: "sem fonte de presença", status: "unavailable", icon: "telemetry" },
        { label: "Origem", value: "Local", detail: ".matriz/activity", status: "temporary", icon: "database" },
      ]} />
      {vm.actors.length ? <section className="hub-agent-ledger">{vm.actors.map((actor) => (
        <article key={actor.id}>
          <span className="hub-agent-ledger__sigil"><HubIcon name="agent" size={24} /></span>
          <div><small>ATOR / {actor.technicalName}</small><h2>{actor.name}</h2><p>{actor.lastSummary}</p></div>
          <dl><div><dt>Registros</dt><dd>{actor.activityCount}</dd></div><div><dt>Última atividade</dt><dd>{actor.lastActivityAt ? new Date(actor.lastActivityAt).toLocaleString("pt-BR") : "—"}</dd></div></dl>
          <StatusLabel status={actor.status}>{actor.statusLabel}</StatusLabel>
        </article>
      ))}</section> : <SurfaceState kind="empty" title="Nenhum ator registrado" description="Atores aparecerão depois que uma atividade real for persistida nos arquivos locais do Hub." />}
      <section className="hub-operation-note"><HubIcon name="warning" size={20} /><div><strong>Presença em tempo real indisponível</strong><p>O Hub ainda não possui uma fonte pública de heartbeat ou execução ativa de agentes. Por isso, nenhum ator acima é apresentado como online.</p></div></section>
    </div>
  )
}
