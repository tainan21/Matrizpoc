import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { presentEvolution } from "../../src/ui/evolution/evolution-presenter"
import { readEvolutionSource } from "../../src/ui/evolution/evolution-source"
import { MetricStrip, OperationalPageHeader, ProgressTrack } from "../../src/ui/structure/OperationalPage"

export const dynamic = "force-dynamic"

export default function RoadmapPage() {
  const source = readEvolutionSource()
  const vm = presentEvolution(source)
  const inReview = vm.work.filter((item) => item.status === "approval").length

  return (
    <div className="hub-page">
      <OperationalPageHeader eyebrow="Evolução / plano local" title="Horizonte do Matriz-Hub" description="Leitura dos arquivos .matriz deste app. Fases declaradas são compromissos; itens de backlog continuam ideias ou trabalho em revisão." status={vm.declaredPhaseCount ? "available" : "planned"} statusLabel={vm.declaredPhaseCount ? "Roadmap declarado" : "Sem fases declaradas"} />
      <MetricStrip items={[
        { label: "Fases", value: vm.declaredPhaseCount, detail: "roadmap.json", status: vm.declaredPhaseCount ? "available" : "planned", icon: "roadmap" },
        { label: "Objetivos", value: vm.declaredGoalCount, detail: "declarados", status: vm.declaredGoalCount ? "available" : "planned", icon: "flag" },
        { label: "Backlog", value: vm.work.length, detail: "arquivos locais", status: vm.work.length ? "available" : "waiting", icon: "layers" },
        { label: "Em revisão", value: inReview, detail: "pedem decisão", status: inReview ? "approval" : "complete", icon: "review" },
      ]} />
      <section className="hub-evolution-layout">
        <div className="hub-evolution-main">
          <header className="hub-structure-toolbar"><div><h2>Trabalho conhecido</h2><small>Backlog não equivale a compromisso de entrega</small></div><StatusLabel compact status="temporary">Arquivo local</StatusLabel></header>
          {vm.work.length ? <ol className="hub-roadmap-list">{vm.work.map((item, index) => (
            <li key={item.id}>
              <span className="hub-roadmap-list__index">{String(index + 1).padStart(2, "0")}</span>
              <div className="hub-roadmap-list__copy"><small>{item.priority ?? "prioridade não declarada"} · {item.technicalStatus}</small><strong>{item.title}</strong><p>{item.description}</p><div>{item.tags?.map((tag) => <code key={tag}>{tag}</code>)}</div></div>
              <div className="hub-roadmap-list__progress"><StatusLabel compact status={item.status}>{item.statusLabel}</StatusLabel><strong>{item.progress}%</strong><ProgressTrack label={`Critérios de ${item.title}`} status={item.status} value={item.progress} /><small>{item.completedCriteria}/{item.totalCriteria} critérios</small></div>
            </li>
          ))}</ol> : <SurfaceState compact kind="empty" title="Nenhum trabalho declarado" description="O Hub não criou itens artificiais. Adicione fases ao roadmap ou arquivos ao backlog quando houver uma decisão real." />}
        </div>
        <aside className="hub-evolution-context"><HubIcon name="roadmap" size={28} /><span className="hub-eyebrow">Leitura correta</span><h2>Plano não é promessa automática</h2><p>O roadmap atual não declara fases. Os itens visíveis vêm do backlog local e preservam seu estado original.</p><dl><div><dt>Origem</dt><dd>.matriz</dd></div><div><dt>Persistência</dt><dd>Arquivo local</dd></div><div><dt>Erros</dt><dd>{source.errors.length}</dd></div></dl></aside>
      </section>
    </div>
  )
}
